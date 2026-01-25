"""
Real Document Extraction Module
Extracts quotation data from uploaded files (PDF, images, Excel, Word) using AI
"""

import os
import io
import json
import base64
import logging
from typing import Dict, Optional, List
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# Import file processing libraries
try:
    from PyPDF2 import PdfReader
    PDF_AVAILABLE = True
except ImportError:
    PDF_AVAILABLE = False
    logger.warning("PyPDF2 not available - PDF text extraction disabled")

try:
    from docx import Document
    DOCX_AVAILABLE = True
except ImportError:
    DOCX_AVAILABLE = False
    logger.warning("python-docx not available - DOCX extraction disabled")

try:
    from openpyxl import load_workbook
    EXCEL_AVAILABLE = True
except ImportError:
    EXCEL_AVAILABLE = False
    logger.warning("openpyxl not available - Excel extraction disabled")

try:
    from PIL import Image
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False
    logger.warning("Pillow not available - Image processing disabled")

# Import Emergent LLM integration
try:
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    EMERGENT_AVAILABLE = True
except ImportError:
    EMERGENT_AVAILABLE = False
    logger.warning("emergentintegrations not available")

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")

# System prompt for document extraction
EXTRACTION_SYSTEM_PROMPT = """You are an expert document parser specializing in extracting structured data from procurement quotations and invoices.

Your task is to extract ALL information from the provided document content and return it in a specific JSON format.

IMPORTANT RULES:
1. Extract EXACTLY what is in the document - do not invent or assume data
2. If a field is not present in the document, use null or appropriate default
3. Parse ALL line items with their exact descriptions, quantities, unit prices
4. Identify the supplier/vendor information
5. Extract totals, taxes, and any discounts mentioned
6. Note the currency if specified
7. For EACH line item, classify with UNSPSC code based on product/service description

You MUST respond with ONLY valid JSON in this exact structure:
{
    "supplier": {
        "name": "extracted supplier/vendor name",
        "address": "full address if available",
        "city": "city, state/country",
        "tax_id": "tax ID if present",
        "contact_email": "email if present",
        "contact_phone": "phone if present"
    },
    "quotation_details": {
        "quotation_number": "quote/invoice number",
        "quotation_date": "YYYY-MM-DD format",
        "valid_until": "YYYY-MM-DD if present",
        "payment_terms": "payment terms if specified",
        "delivery_terms": "delivery terms if specified",
        "currency": "USD/EUR/etc"
    },
    "line_items": [
        {
            "line_number": 1,
            "description": "exact product/service description from document",
            "quantity": number,
            "unit_price": number,
            "unit": "EA/HR/etc",
            "line_total": number,
            "category": "best category match",
            "part_number": "if present",
            "unspsc_code": "8-digit UNSPSC code (e.g., 31171500 for Bearings)",
            "unspsc_category": "UNSPSC category name"
        }
    ],
    "totals": {
        "subtotal": number,
        "tax_rate": decimal (e.g., 0.08 for 8%),
        "tax_amount": number,
        "shipping": number,
        "discount": number,
        "grand_total": number
    },
    "notes": "any additional notes or terms from the document",
    "extraction_confidence": 0.0-1.0 based on clarity of document
}

If the document is unclear or you cannot extract certain information, still provide the structure with null values and note the issues in the notes field."""


def extract_text_from_pdf(file_content: bytes) -> str:
    """Extract text content from PDF file"""
    if not PDF_AVAILABLE:
        return ""
    
    try:
        pdf_reader = PdfReader(io.BytesIO(file_content))
        text_content = []
        for page in pdf_reader.pages:
            text = page.extract_text()
            if text:
                text_content.append(text)
        return "\n\n".join(text_content)
    except Exception as e:
        logger.error(f"PDF extraction error: {e}")
        return ""


def extract_text_from_docx(file_content: bytes) -> str:
    """Extract text content from Word document"""
    if not DOCX_AVAILABLE:
        return ""
    
    try:
        doc = Document(io.BytesIO(file_content))
        text_content = []
        for para in doc.paragraphs:
            if para.text.strip():
                text_content.append(para.text)
        
        # Also extract tables
        for table in doc.tables:
            for row in table.rows:
                row_text = " | ".join(cell.text.strip() for cell in row.cells if cell.text.strip())
                if row_text:
                    text_content.append(row_text)
        
        return "\n".join(text_content)
    except Exception as e:
        logger.error(f"DOCX extraction error: {e}")
        return ""


def extract_text_from_excel(file_content: bytes) -> str:
    """Extract text content from Excel file"""
    if not EXCEL_AVAILABLE:
        return ""
    
    try:
        workbook = load_workbook(io.BytesIO(file_content), data_only=True)
        text_content = []
        
        for sheet in workbook.worksheets:
            text_content.append(f"=== Sheet: {sheet.title} ===")
            for row in sheet.iter_rows():
                row_values = []
                for cell in row:
                    if cell.value is not None:
                        row_values.append(str(cell.value))
                if row_values:
                    text_content.append(" | ".join(row_values))
        
        return "\n".join(text_content)
    except Exception as e:
        logger.error(f"Excel extraction error: {e}")
        return ""


def image_to_base64(file_content: bytes, file_type: str) -> str:
    """Convert image to base64 for AI vision processing"""
    if not PIL_AVAILABLE:
        return ""
    
    try:
        # Resize large images to reduce token usage
        image = Image.open(io.BytesIO(file_content))
        
        # Convert to RGB if necessary
        if image.mode in ('RGBA', 'P'):
            image = image.convert('RGB')
        
        # Resize if too large (max 2000px on longest side)
        max_size = 2000
        if max(image.size) > max_size:
            ratio = max_size / max(image.size)
            new_size = tuple(int(dim * ratio) for dim in image.size)
            image = image.resize(new_size, Image.Resampling.LANCZOS)
        
        # Convert to base64
        buffer = io.BytesIO()
        image.save(buffer, format='JPEG', quality=85)
        return base64.b64encode(buffer.getvalue()).decode('utf-8')
    except Exception as e:
        logger.error(f"Image processing error: {e}")
        return ""


async def extract_with_ai_text(text_content: str, session_id: str) -> Dict:
    """Use AI to extract structured data from text content"""
    if not EMERGENT_AVAILABLE or not EMERGENT_LLM_KEY:
        logger.error("Emergent LLM not available for extraction")
        return None
    
    if not text_content or len(text_content.strip()) < 50:
        logger.warning("Insufficient text content for extraction")
        return None
    
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"{session_id}_extract",
            system_message=EXTRACTION_SYSTEM_PROMPT
        ).with_model("openai", "gpt-5.2")
        
        prompt = f"""Please extract all quotation/invoice data from the following document content:

---DOCUMENT START---
{text_content[:15000]}  
---DOCUMENT END---

Extract all line items, supplier info, totals, and return as JSON."""

        message = UserMessage(text=prompt)
        response = await chat.send_message(message)
        
        # Parse JSON response
        response_text = str(response)
        
        # Try to extract JSON from response
        if "```json" in response_text:
            json_str = response_text.split("```json")[1].split("```")[0].strip()
        elif "```" in response_text:
            json_str = response_text.split("```")[1].split("```")[0].strip()
        else:
            # Find JSON object in response
            start_idx = response_text.find('{')
            end_idx = response_text.rfind('}') + 1
            if start_idx >= 0 and end_idx > start_idx:
                json_str = response_text[start_idx:end_idx]
            else:
                json_str = response_text
        
        extracted_data = json.loads(json_str)
        extracted_data["extraction_method"] = "ai_text"
        return extracted_data
        
    except json.JSONDecodeError as e:
        logger.error(f"JSON parsing error: {e}")
        return None
    except Exception as e:
        logger.error(f"AI text extraction error: {e}")
        return None


async def extract_with_ai_vision(image_base64: str, session_id: str) -> Dict:
    """Use AI vision to extract structured data from image"""
    if not EMERGENT_AVAILABLE or not EMERGENT_LLM_KEY:
        logger.error("Emergent LLM not available for extraction")
        return None
    
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"{session_id}_vision",
            system_message=EXTRACTION_SYSTEM_PROMPT
        ).with_model("openai", "gpt-5.2")
        
        # Create message with image
        message = UserMessage(
            text="Please extract all quotation/invoice data from this document image. Return the data as JSON.",
            images=[f"data:image/jpeg;base64,{image_base64}"]
        )
        response = await chat.send_message(message)
        
        # Parse JSON response
        response_text = str(response)
        
        if "```json" in response_text:
            json_str = response_text.split("```json")[1].split("```")[0].strip()
        elif "```" in response_text:
            json_str = response_text.split("```")[1].split("```")[0].strip()
        else:
            start_idx = response_text.find('{')
            end_idx = response_text.rfind('}') + 1
            if start_idx >= 0 and end_idx > start_idx:
                json_str = response_text[start_idx:end_idx]
            else:
                json_str = response_text
        
        extracted_data = json.loads(json_str)
        extracted_data["extraction_method"] = "ai_vision"
        return extracted_data
        
    except json.JSONDecodeError as e:
        logger.error(f"JSON parsing error in vision: {e}")
        return None
    except Exception as e:
        logger.error(f"AI vision extraction error: {e}")
        return None


async def extract_quotation_data(
    file_content: bytes,
    file_name: str,
    file_type: str,
    supplier_name: Optional[str] = None,
    session_id: str = "extract"
) -> Dict:
    """
    Main function to extract quotation data from uploaded file.
    Supports PDF, images, Excel, and Word documents.
    """
    logger.info(f"Extracting data from {file_name} (type: {file_type})")
    
    extracted_data = None
    text_content = ""
    
    # Determine file type and extract accordingly
    file_ext = file_name.lower().split('.')[-1] if '.' in file_name else ''
    
    # Try text extraction first for supported formats
    if file_type == 'application/pdf' or file_ext == 'pdf':
        text_content = extract_text_from_pdf(file_content)
        logger.info(f"Extracted {len(text_content)} chars from PDF")
        
    elif file_type in ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
                       'application/msword'] or file_ext in ['docx', 'doc']:
        text_content = extract_text_from_docx(file_content)
        logger.info(f"Extracted {len(text_content)} chars from Word doc")
        
    elif file_type in ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                       'application/vnd.ms-excel'] or file_ext in ['xlsx', 'xls']:
        text_content = extract_text_from_excel(file_content)
        logger.info(f"Extracted {len(text_content)} chars from Excel")
    
    # If we have text content, use text-based AI extraction
    if text_content and len(text_content.strip()) > 100:
        logger.info("Using AI text extraction")
        extracted_data = await extract_with_ai_text(text_content, session_id)
    
    # For images or if text extraction failed, use vision
    if extracted_data is None:
        is_image = (file_type.startswith('image/') or 
                    file_ext in ['png', 'jpg', 'jpeg', 'gif', 'webp', 'tiff'])
        
        if is_image or (not text_content and PDF_AVAILABLE):
            logger.info("Using AI vision extraction")
            
            # For PDFs without text, convert to image
            if file_type == 'application/pdf' or file_ext == 'pdf':
                # Try text one more time, if still empty, we'd need pdf2image
                # For now, return error suggesting image upload
                if not text_content:
                    logger.warning("PDF has no extractable text - may be scanned document")
            
            # For actual images
            if is_image:
                image_b64 = image_to_base64(file_content, file_type)
                if image_b64:
                    extracted_data = await extract_with_ai_vision(image_b64, session_id)
    
    # If extraction failed, return error structure
    if extracted_data is None:
        logger.error("All extraction methods failed")
        return {
            "error": True,
            "message": "Could not extract data from document. Please ensure the file contains readable text or is a clear image.",
            "supplier": {
                "name": supplier_name or "Unknown",
                "address": None,
                "city": None,
                "tax_id": None,
                "contact_email": None
            },
            "quotation_details": {
                "quotation_number": None,
                "quotation_date": datetime.now().strftime("%Y-%m-%d"),
                "valid_until": None,
                "payment_terms": None,
                "delivery_terms": None
            },
            "line_items": [],
            "totals": {
                "subtotal": 0,
                "tax_rate": 0,
                "tax_amount": 0,
                "shipping": 0,
                "grand_total": 0
            },
            "extraction_confidence": 0,
            "document_language": "Unknown",
            "pages_processed": 0
        }
    
    # Validate and clean up extracted data
    extracted_data = validate_and_clean_extraction(extracted_data, supplier_name)
    
    return extracted_data


def validate_and_clean_extraction(data: Dict, supplier_name: Optional[str] = None) -> Dict:
    """Validate and clean up extracted data, ensuring proper structure"""
    
    # Ensure supplier structure
    if "supplier" not in data or not isinstance(data["supplier"], dict):
        data["supplier"] = {}
    
    supplier = data["supplier"]
    supplier.setdefault("name", supplier_name or "Unknown Supplier")
    supplier.setdefault("address", None)
    supplier.setdefault("city", None)
    supplier.setdefault("tax_id", None)
    supplier.setdefault("contact_email", None)
    
    # Override with provided supplier name if given
    if supplier_name:
        supplier["name"] = supplier_name
    
    # Ensure quotation_details structure
    if "quotation_details" not in data or not isinstance(data["quotation_details"], dict):
        data["quotation_details"] = {}
    
    details = data["quotation_details"]
    details.setdefault("quotation_number", f"QT-{datetime.now().strftime('%Y%m%d%H%M%S')}")
    details.setdefault("quotation_date", datetime.now().strftime("%Y-%m-%d"))
    details.setdefault("valid_until", None)
    details.setdefault("payment_terms", None)
    details.setdefault("delivery_terms", None)
    details.setdefault("currency", "USD")
    
    # Ensure line_items is a list with proper structure
    if "line_items" not in data or not isinstance(data["line_items"], list):
        data["line_items"] = []
    
    cleaned_items = []
    for i, item in enumerate(data["line_items"]):
        if not isinstance(item, dict):
            continue
        
        cleaned_item = {
            "line_number": item.get("line_number", i + 1),
            "description": str(item.get("description", "Unknown Item")),
            "quantity": float(item.get("quantity", 1)) if item.get("quantity") else 1,
            "unit_price": float(item.get("unit_price", 0)) if item.get("unit_price") else 0,
            "unit": str(item.get("unit", "EA")),
            "line_total": float(item.get("line_total", 0)) if item.get("line_total") else 0,
            "category": str(item.get("category", "General")),
            "part_number": item.get("part_number")
        }
        
        # Calculate line_total if not provided
        if cleaned_item["line_total"] == 0 and cleaned_item["unit_price"] > 0:
            cleaned_item["line_total"] = round(cleaned_item["unit_price"] * cleaned_item["quantity"], 2)
        
        cleaned_items.append(cleaned_item)
    
    data["line_items"] = cleaned_items
    
    # Ensure totals structure
    if "totals" not in data or not isinstance(data["totals"], dict):
        data["totals"] = {}
    
    totals = data["totals"]
    
    # Calculate subtotal from line items if not provided
    calculated_subtotal = sum(item["line_total"] for item in cleaned_items)
    totals.setdefault("subtotal", calculated_subtotal or 0)
    totals.setdefault("tax_rate", 0)
    totals.setdefault("tax_amount", 0)
    totals.setdefault("shipping", 0)
    totals.setdefault("discount", 0)
    
    # Calculate grand_total if not provided
    if "grand_total" not in totals or not totals["grand_total"]:
        totals["grand_total"] = (
            float(totals.get("subtotal", 0)) + 
            float(totals.get("tax_amount", 0)) + 
            float(totals.get("shipping", 0)) - 
            float(totals.get("discount", 0))
        )
    
    # Convert all numeric values to proper types
    for key in ["subtotal", "tax_rate", "tax_amount", "shipping", "discount", "grand_total"]:
        if key in totals:
            try:
                totals[key] = float(totals[key]) if totals[key] else 0
            except (ValueError, TypeError):
                totals[key] = 0
    
    # Add metadata
    data.setdefault("extraction_confidence", 0.85)
    data.setdefault("document_language", "English")
    data.setdefault("pages_processed", 1)
    data.setdefault("error", False)
    
    return data
