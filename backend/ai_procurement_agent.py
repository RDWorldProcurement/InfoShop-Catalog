"""
AI Procurement Agent - Conversational AI for Intelligent Procurement Handling
Uses GPT-5.2, Claude, and Gemini in parallel for comprehensive analysis
"""

import os
import asyncio
import json
import logging
import re
from typing import Dict, List, Any, Optional
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# Import emergent integrations
try:
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    EMERGENT_AVAILABLE = True
except ImportError:
    EMERGENT_AVAILABLE = False
    logger.warning("emergentintegrations not available - using mock mode")

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")

# System prompt for the AI Procurement Agent
PROCUREMENT_AGENT_SYSTEM_PROMPT = """You are an expert AI Procurement Agent for Infosys BPM's OMNISupply.io platform.
Your role is to intelligently guide users through their procurement needs using natural conversation.

CAPABILITIES:
1. Product Search - Help users find products by name, OEM/manufacturer, part numbers
2. Service Search - Help users find professional services by description or category
3. Quotation Analysis - If users have quotations, guide them to upload for AI analysis
4. Strategic Sourcing - For complex, multi-year engagements, route to Managed Services

BEHAVIOR RULES:
- Be helpful, professional, and conversational
- Ask clarifying questions to understand exact needs
- If user mentions specific part numbers or OEM names, search the catalog
- If no matches found, offer alternatives: upload quotation or provide supplier contact
- For complex/strategic needs (multi-year, site visits, category management), route to Managed Services
- Always suggest UNSPSC codes and category names for complex sourcing

RESPONSE FORMAT:
Always respond with a JSON object containing:
{
  "message": "Your conversational response to the user",
  "intent": "product_search|service_search|quotation_upload|managed_services|general",
  "search_query": "extracted search terms if applicable",
  "search_type": "product|service|null",
  "needs_supplier_info": true/false,
  "is_complex_sourcing": true/false,
  "suggested_unspsc": {"code": "XXXXXXXX", "name": "Category Name"} or null,
  "next_action": "search|upload_quotation|managed_services|collect_supplier|continue_chat"
}
"""

INTENT_CLASSIFIER_PROMPT = """Analyze the user message and determine the procurement intent.
Classify into one of:
- product_search: User looking for physical products, parts, equipment
- service_search: User looking for professional services, consulting, maintenance
- quotation_upload: User has a quotation to analyze
- managed_services: Complex sourcing needs (multi-year, strategic, category management)
- supplier_contact: User wants to contact a new supplier
- general: General questions or unclear intent

Also extract:
- Key search terms (product names, part numbers, OEM names)
- Whether this seems like a complex/strategic need
- Suggested UNSPSC code if applicable

Respond in JSON format only."""


async def analyze_intent_with_gpt(message: str, context: Dict, session_id: str) -> Dict:
    """Use GPT-5.2 to analyze user intent and extract key information"""
    if not EMERGENT_AVAILABLE or not EMERGENT_LLM_KEY:
        return {"error": "GPT not available"}
    
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"{session_id}_gpt_intent",
            system_message=INTENT_CLASSIFIER_PROMPT
        ).with_model("openai", "gpt-5.2")
        
        prompt = f"""User message: "{message}"

Previous context: {json.dumps(context)}

Analyze the intent and respond with JSON only."""

        response = await chat.send_message(UserMessage(text=prompt))
        response_text = str(response)
        
        # Extract JSON from response
        try:
            if "```json" in response_text:
                json_str = response_text.split("```json")[1].split("```")[0].strip()
            elif "```" in response_text:
                json_str = response_text.split("```")[1].split("```")[0].strip()
            else:
                json_str = response_text
            return json.loads(json_str)
        except:
            return {"intent": "general", "search_query": message}
    except Exception as e:
        logger.error(f"GPT intent analysis error: {e}")
        return {"error": str(e)}


async def generate_response_with_claude(message: str, intent_analysis: Dict, context: Dict, session_id: str) -> str:
    """Use Claude to generate a conversational response"""
    if not EMERGENT_AVAILABLE or not EMERGENT_LLM_KEY:
        return "I apologize, but I'm having trouble processing your request. Please try again."
    
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"{session_id}_claude_response",
            system_message=PROCUREMENT_AGENT_SYSTEM_PROMPT
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        
        prompt = f"""User message: "{message}"

Intent analysis from GPT: {json.dumps(intent_analysis)}
Conversation context: {json.dumps(context)}

Generate a helpful, conversational response. If searching for products/services, indicate you will search.
If the intent is complex sourcing, gather requirements and suggest UNSPSC classification.
Keep the tone professional but friendly, representing Infosys BPM."""

        response = await chat.send_message(UserMessage(text=prompt))
        return str(response)
    except Exception as e:
        logger.error(f"Claude response error: {e}")
        return "I'm here to help with your procurement needs. Could you please provide more details?"


async def validate_with_gemini(message: str, intent: Dict, response: str, session_id: str) -> Dict:
    """Use Gemini to validate and enhance the response"""
    if not EMERGENT_AVAILABLE or not EMERGENT_LLM_KEY:
        return {"validated": True, "enhancements": []}
    
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"{session_id}_gemini_validate",
            system_message="You validate AI responses for procurement conversations. Check for accuracy and suggest improvements."
        ).with_model("gemini", "gemini-3-flash-preview")
        
        prompt = f"""Validate this procurement conversation:
User: "{message}"
Intent: {json.dumps(intent)}
AI Response: "{response}"

Check if the response is appropriate and helpful. Respond with JSON:
{{"validated": true/false, "suggestions": ["suggestion1", ...], "risk_flags": []}}"""

        result = await chat.send_message(UserMessage(text=prompt))
        result_text = str(result)
        
        try:
            if "```json" in result_text:
                json_str = result_text.split("```json")[1].split("```")[0].strip()
            else:
                json_str = result_text
            return json.loads(json_str)
        except:
            return {"validated": True, "suggestions": []}
    except Exception as e:
        logger.error(f"Gemini validation error: {e}")
        return {"validated": True, "suggestions": []}


async def process_ai_conversation(
    message: str,
    session_id: str,
    context: Dict,
    db,
    user_email: str,
    language: str = "en",
    currency: str = "USD"
) -> Dict:
    """
    Main function to process user message through AI procurement agent
    Uses all 3 LLMs in a coordinated workflow
    """
    
    engines_used = []
    
    # Step 1: Analyze intent with GPT
    intent_analysis = await analyze_intent_with_gpt(message, context, session_id)
    if "error" not in intent_analysis:
        engines_used.append("gpt")
    
    # Determine the intent
    intent = intent_analysis.get("intent", "general")
    search_query = intent_analysis.get("search_query", "")
    is_complex = intent_analysis.get("is_complex_sourcing", False)
    
    # Step 2: Generate response with Claude
    response_text = await generate_response_with_claude(message, intent_analysis, context, session_id)
    engines_used.append("claude")
    
    # Step 3: Validate with Gemini
    validation = await validate_with_gemini(message, intent_analysis, response_text, session_id)
    if "error" not in validation:
        engines_used.append("gemini")
    
    # Prepare result
    result = {
        "message": response_text,
        "intent": intent,
        "engines_used": engines_used,
        "context": {
            "intent": intent,
            "searchType": intent_analysis.get("search_type"),
            "searchQuery": search_query,
            "isComplex": is_complex
        }
    }
    
    # Handle different intents
    if intent == "product_search" and search_query:
        # Search products in database
        products = await search_products(db, search_query)
        if products:
            result["products"] = products
            result["message"] = f"I found {len(products)} product(s) matching your search. Here are the results:"
        else:
            result["message"] = f"""I couldn't find "{search_query}" in our pre-negotiated catalog.

However, I can help you in other ways:

• **Upload a Quotation** - If you have a quote from a supplier, I can analyze it with AI-powered price benchmarking
• **Contact a Supplier** - Provide supplier details and I'll help get a quotation
• **Request Sourcing Support** - Our Infosys Buying Desk can source this for you

What would you prefer?"""
    
    elif intent == "service_search" and search_query:
        # Search services in database
        services = await search_services(db, search_query)
        if services:
            result["services"] = services
            result["message"] = f"I found {len(services)} service(s) matching your needs. Here are the options:"
        else:
            result["message"] = f"""I couldn't find professional services matching "{search_query}" in our catalog.

I can help you with:

• **Upload a Service Quotation** - If you have a quote, I'll analyze the rates
• **Managed Services** - Our experts can source specialized services for you

How would you like to proceed?"""
    
    elif intent == "managed_services" or is_complex:
        # Generate UNSPSC suggestion
        unspsc = await suggest_unspsc(search_query or message, session_id)
        result["unspsc_suggestion"] = unspsc
        result["managed_service_form"] = True
        result["message"] = f"""This sounds like a strategic sourcing requirement that would benefit from our **Managed Services** expertise.

Based on your description, I've classified this as:
• **UNSPSC Code**: {unspsc.get('code', 'To be determined')}
• **Category**: {unspsc.get('name', 'Strategic Sourcing')}

Our Infosys Category Experts specialize in:
• Multi-year contract negotiations
• Strategic supplier partnerships
• Complex RFQ management
• Site visits and technical assessments

A **Category Expert will be in touch shortly** to discuss your requirements in detail.

Would you like to provide any additional details about your sourcing needs?"""
    
    elif intent == "quotation_upload":
        result["action"] = "redirect_quotation"
        result["message"] = """Great! I can help you analyze that quotation with our AI-powered price benchmarking.

Our system uses **3 AI Engines** (GPT-5.2, Claude, and Gemini) to:
• Extract line items automatically
• Benchmark prices against market data
• Identify potential savings
• Verify tax calculations

Would you like to proceed to the **AI Enabled Intelligent Quotation Based Buying** page to upload your quotation?"""
    
    # Store conversation in database
    await db.ai_conversations.insert_one({
        "session_id": session_id,
        "user_email": user_email,
        "message": message,
        "response": result["message"],
        "intent": intent,
        "engines_used": engines_used,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    
    return result


async def search_products(db, query: str, limit: int = 5) -> List[Dict]:
    """Search products in the database"""
    try:
        # Create search pattern
        pattern = {"$regex": query, "$options": "i"}
        
        products = await db.vendor_products.find({
            "$or": [
                {"name": pattern},
                {"description": pattern},
                {"brand": pattern},
                {"sku": pattern},
                {"manufacturer_part_number": pattern}
            ]
        }, {"_id": 0}).limit(limit).to_list(limit)
        
        return products
    except Exception as e:
        logger.error(f"Product search error: {e}")
        return []


async def search_services(db, query: str, limit: int = 5) -> List[Dict]:
    """Search services in the database"""
    try:
        pattern = {"$regex": query, "$options": "i"}
        
        services = await db.vendor_services.find({
            "$or": [
                {"name": pattern},
                {"description": pattern},
                {"category": pattern}
            ]
        }, {"_id": 0}).limit(limit).to_list(limit)
        
        return services
    except Exception as e:
        logger.error(f"Service search error: {e}")
        return []


async def suggest_unspsc(description: str, session_id: str) -> Dict:
    """Suggest UNSPSC code based on description"""
    # Common UNSPSC mappings
    unspsc_mappings = {
        "it": {"code": "43000000", "name": "Information Technology Broadcasting and Telecommunications"},
        "software": {"code": "43230000", "name": "Software"},
        "consulting": {"code": "80110000", "name": "Management advisory services"},
        "maintenance": {"code": "72100000", "name": "Building and facility maintenance services"},
        "construction": {"code": "72140000", "name": "Heavy construction services"},
        "logistics": {"code": "78100000", "name": "Mail and cargo transport"},
        "hr": {"code": "80111500", "name": "Human resources services"},
        "marketing": {"code": "80140000", "name": "Marketing and distribution"},
        "manufacturing": {"code": "31000000", "name": "Manufacturing Components and Supplies"},
        "office": {"code": "44000000", "name": "Office Equipment and Accessories"},
    }
    
    description_lower = description.lower()
    
    for keyword, unspsc in unspsc_mappings.items():
        if keyword in description_lower:
            return unspsc
    
    # Default for complex sourcing
    return {"code": "80000000", "name": "Management and Business Professionals and Administrative Services"}
