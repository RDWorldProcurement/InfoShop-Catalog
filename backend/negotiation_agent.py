"""
Negotiation Agent Module
AI-powered autonomous negotiation for procurement
Phase 1: Target pricing, strategy playbooks, email generation, counter-offer tracking
"""

import os
import json
import logging
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from enum import Enum
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# Import Emergent LLM integration
try:
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    EMERGENT_AVAILABLE = True
except ImportError:
    EMERGENT_AVAILABLE = False
    logger.warning("emergentintegrations not available for negotiation")

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")


class NegotiationStrategy(str, Enum):
    AGGRESSIVE = "aggressive"
    BALANCED = "balanced"
    RELATIONSHIP = "relationship"
    VOLUME_BASED = "volume_based"
    URGENT = "urgent"


# Negotiation Playbooks - Pre-configured strategies
NEGOTIATION_PLAYBOOKS = {
    NegotiationStrategy.AGGRESSIVE: {
        "name": "Aggressive Cost Reduction",
        "description": "Maximize savings, willing to switch suppliers",
        "target_discount": 0.20,  # Aim for 20% below market
        "initial_offer_discount": 0.25,  # Start 25% below quoted
        "max_rounds": 4,
        "walk_away_threshold": 0.10,  # Walk away if less than 10% savings
        "tone": "firm",
        "leverage_points": ["competitive quotes", "volume commitment", "market data"],
        "concession_rate": 0.02,  # Give up 2% per round max
    },
    NegotiationStrategy.BALANCED: {
        "name": "Balanced Negotiation",
        "description": "Fair deal for both parties, maintain relationship",
        "target_discount": 0.12,
        "initial_offer_discount": 0.15,
        "max_rounds": 3,
        "walk_away_threshold": 0.05,
        "tone": "professional",
        "leverage_points": ["long-term partnership", "market rates", "payment terms"],
        "concession_rate": 0.03,
    },
    NegotiationStrategy.RELATIONSHIP: {
        "name": "Relationship Focused",
        "description": "Preserve strategic supplier relationship",
        "target_discount": 0.08,
        "initial_offer_discount": 0.10,
        "max_rounds": 2,
        "walk_away_threshold": 0.03,
        "tone": "collaborative",
        "leverage_points": ["future business", "referrals", "joint innovation"],
        "concession_rate": 0.04,
    },
    NegotiationStrategy.VOLUME_BASED: {
        "name": "Volume Commitment",
        "description": "Leverage volume for better pricing",
        "target_discount": 0.18,
        "initial_offer_discount": 0.22,
        "max_rounds": 3,
        "walk_away_threshold": 0.08,
        "tone": "opportunistic",
        "leverage_points": ["increased volume", "multi-year contract", "exclusivity"],
        "concession_rate": 0.025,
    },
    NegotiationStrategy.URGENT: {
        "name": "Urgent Requirement",
        "description": "Quick closure needed, moderate savings acceptable",
        "target_discount": 0.06,
        "initial_offer_discount": 0.08,
        "max_rounds": 2,
        "walk_away_threshold": 0.02,
        "tone": "direct",
        "leverage_points": ["quick payment", "immediate PO", "simplified process"],
        "concession_rate": 0.03,
    }
}


def calculate_target_price(
    quoted_price: float,
    market_avg_price: float,
    strategy: NegotiationStrategy = NegotiationStrategy.BALANCED
) -> Dict:
    """
    Calculate recommended target price based on market data and strategy
    """
    playbook = NEGOTIATION_PLAYBOOKS[strategy]
    
    # Base target on market average
    target_discount = playbook["target_discount"]
    initial_discount = playbook["initial_offer_discount"]
    
    # Calculate prices
    target_price = market_avg_price * (1 - target_discount * 0.5)  # Target slightly below market
    initial_offer = quoted_price * (1 - initial_discount)
    walk_away_price = quoted_price * (1 - playbook["walk_away_threshold"])
    
    # If quoted is already below market, adjust
    if quoted_price <= market_avg_price:
        variance = (market_avg_price - quoted_price) / market_avg_price
        target_price = quoted_price * (1 - max(0.03, target_discount * 0.3))
        initial_offer = quoted_price * (1 - max(0.05, initial_discount * 0.4))
    
    # Calculate potential savings
    potential_savings = quoted_price - target_price
    potential_savings_percent = (potential_savings / quoted_price) * 100
    
    return {
        "quoted_price": round(quoted_price, 2),
        "market_avg_price": round(market_avg_price, 2),
        "target_price": round(target_price, 2),
        "initial_offer": round(initial_offer, 2),
        "walk_away_price": round(walk_away_price, 2),
        "potential_savings": round(potential_savings, 2),
        "potential_savings_percent": round(potential_savings_percent, 1),
        "strategy": strategy.value,
        "playbook": playbook["name"],
        "max_rounds": playbook["max_rounds"],
        "recommendation": get_negotiation_recommendation(quoted_price, market_avg_price)
    }


def get_negotiation_recommendation(quoted_price: float, market_avg_price: float) -> str:
    """Get negotiation recommendation based on price analysis"""
    variance = ((quoted_price - market_avg_price) / market_avg_price) * 100
    
    if variance > 20:
        return "STRONG_NEGOTIATE"
    elif variance > 10:
        return "NEGOTIATE"
    elif variance > 0:
        return "LIGHT_NEGOTIATE"
    elif variance > -10:
        return "ACCEPT_OR_NEGOTIATE"
    else:
        return "ACCEPT"


def generate_negotiation_targets(
    line_items: List[Dict],
    benchmarks: List[Dict],
    strategy: NegotiationStrategy = NegotiationStrategy.BALANCED
) -> Dict:
    """
    Generate negotiation targets for all line items
    """
    item_targets = []
    total_quoted = 0
    total_target = 0
    total_market = 0
    
    for i, item in enumerate(line_items):
        benchmark = benchmarks[i] if i < len(benchmarks) else {}
        
        quoted_price = float(item.get("line_total", 0))
        market_avg = float(benchmark.get("market_avg_price", quoted_price))
        
        # If no market price, estimate based on quoted
        if market_avg == 0:
            market_avg = quoted_price * 0.9
        
        target = calculate_target_price(quoted_price, market_avg, strategy)
        
        item_targets.append({
            "item": item.get("description", f"Item {i+1}"),
            "quantity": item.get("quantity", 1),
            "unit_price": item.get("unit_price", 0),
            **target
        })
        
        total_quoted += quoted_price
        total_target += target["target_price"]
        total_market += market_avg
    
    return {
        "strategy": strategy.value,
        "playbook": NEGOTIATION_PLAYBOOKS[strategy],
        "item_targets": item_targets,
        "summary": {
            "total_quoted": round(total_quoted, 2),
            "total_target": round(total_target, 2),
            "total_market_avg": round(total_market, 2),
            "total_potential_savings": round(total_quoted - total_target, 2),
            "savings_percent": round(((total_quoted - total_target) / total_quoted) * 100, 1) if total_quoted > 0 else 0
        }
    }


# Email templates for different strategies
EMAIL_TEMPLATES = {
    NegotiationStrategy.AGGRESSIVE: """Subject: Request for Revised Pricing - Quote #{quote_number}

Dear {supplier_name},

Thank you for your quotation #{quote_number} dated {quote_date}.

After a comprehensive review and benchmarking against current market rates, we've identified significant variances that require discussion. Our analysis indicates:

{price_analysis}

Based on our market intelligence and competitive quotes we've received, we respectfully request a revised quotation with pricing aligned to current market conditions. Our target is to achieve at least {target_savings_percent}% reduction from the quoted price.

We value efficiency in our procurement process. Please provide your best and final offer within {response_days} business days.

{additional_leverage}

Best regards,
{buyer_name}
{company_name}
""",
    
    NegotiationStrategy.BALANCED: """Subject: Pricing Discussion - Quote #{quote_number}

Dear {supplier_name},

Thank you for submitting quotation #{quote_number}. We appreciate your prompt response and the detailed breakdown provided.

As part of our standard procurement process, we've conducted a market analysis of the quoted items:

{price_analysis}

We believe there's an opportunity to establish mutually beneficial pricing that reflects current market conditions while supporting our ongoing business relationship. We're targeting a {target_savings_percent}% adjustment to align with market rates.

Could we schedule a brief call to discuss, or would you prefer to submit a revised quotation? We're flexible on approach and open to discussing payment terms or volume commitments that might support better pricing.

Looking forward to your response.

Best regards,
{buyer_name}
{company_name}
""",

    NegotiationStrategy.RELATIONSHIP: """Subject: Partnership Pricing Discussion - Quote #{quote_number}

Dear {supplier_name},

I hope this message finds you well. Thank you for the quotation #{quote_number} - we always appreciate working with your team.

As we plan our procurement for the coming period, we're looking at ways to deepen our partnership. Our analysis suggests:

{price_analysis}

Given our history of collaboration and potential for increased business, we'd like to explore whether there's flexibility in the pricing to support a {target_savings_percent}% improvement. We're also happy to discuss:

- Extended contract terms
- Volume commitments
- Referral opportunities
- Joint marketing initiatives

Please let us know your thoughts. We value this relationship and want to find a path forward that works for both organizations.

Warm regards,
{buyer_name}
{company_name}
""",

    NegotiationStrategy.VOLUME_BASED: """Subject: Volume Pricing Request - Quote #{quote_number}

Dear {supplier_name},

Thank you for quotation #{quote_number}. We're evaluating this for a larger procurement initiative.

Our current requirements analysis shows:

{price_analysis}

Given the scale of our potential order and our willingness to commit to a larger volume, we're requesting volume-based pricing that reflects a {target_savings_percent}% improvement. Specifically, we can offer:

- Commitment to {volume_multiplier}x the quoted quantity
- Multi-year framework agreement consideration
- Consolidated ordering to reduce your transaction costs
- Predictable demand planning

Please provide revised pricing based on these volume considerations within {response_days} business days.

Best regards,
{buyer_name}
{company_name}
""",

    NegotiationStrategy.URGENT: """Subject: URGENT: Quick Turnaround Request - Quote #{quote_number}

Dear {supplier_name},

We have an urgent requirement based on your quotation #{quote_number}.

Quick summary of our position:

{price_analysis}

We need to move fast on this. If you can confirm a {target_savings_percent}% price improvement, we can:

- Issue PO within 24 hours
- Arrange expedited payment (Net 15 instead of standard terms)
- Simplify approval process on our end

Please confirm by end of business today if possible.

Regards,
{buyer_name}
{company_name}
"""
}


async def generate_negotiation_email(
    quotation_data: Dict,
    negotiation_targets: Dict,
    strategy: NegotiationStrategy,
    supplier_info: Dict,
    buyer_info: Dict,
    session_id: str = "negotiation"
) -> Dict:
    """
    Generate a professional negotiation email using AI
    """
    playbook = NEGOTIATION_PLAYBOOKS[strategy]
    template = EMAIL_TEMPLATES[strategy]
    
    # Build price analysis section
    price_analysis_lines = []
    for item in negotiation_targets.get("item_targets", [])[:5]:  # Top 5 items
        variance = ((item["quoted_price"] - item["market_avg_price"]) / item["market_avg_price"]) * 100 if item["market_avg_price"] > 0 else 0
        if variance > 5:
            price_analysis_lines.append(
                f"• {item['item']}: Quoted ${item['quoted_price']:,.2f} vs Market ${item['market_avg_price']:,.2f} ({variance:+.1f}% above market)"
            )
        else:
            price_analysis_lines.append(
                f"• {item['item']}: ${item['quoted_price']:,.2f} (within market range)"
            )
    
    price_analysis = "\n".join(price_analysis_lines)
    
    summary = negotiation_targets.get("summary", {})
    
    # Generate additional leverage points based on strategy
    leverage_points = playbook.get("leverage_points", [])
    additional_leverage = ""
    if leverage_points:
        if strategy == NegotiationStrategy.AGGRESSIVE:
            additional_leverage = f"For your reference, we are actively evaluating alternative suppliers and will proceed with the most competitive offer."
        elif strategy == NegotiationStrategy.VOLUME_BASED:
            additional_leverage = f"This volume commitment represents significant growth potential for the right partner."
    
    # Fill template
    email_content = template.format(
        quote_number=quotation_data.get("quotation_number", "N/A"),
        quote_date=quotation_data.get("quotation_date", datetime.now().strftime("%Y-%m-%d")),
        supplier_name=supplier_info.get("name", "Supplier"),
        price_analysis=price_analysis,
        target_savings_percent=summary.get("savings_percent", 10),
        response_days=3 if strategy != NegotiationStrategy.URGENT else 1,
        additional_leverage=additional_leverage,
        volume_multiplier=2,
        buyer_name=buyer_info.get("name", "Procurement Team"),
        company_name=buyer_info.get("company", "Our Company")
    )
    
    # Use AI to enhance and personalize the email
    if EMERGENT_AVAILABLE and EMERGENT_LLM_KEY:
        try:
            enhanced_email = await enhance_email_with_ai(
                email_content, 
                strategy, 
                quotation_data, 
                session_id
            )
            if enhanced_email:
                email_content = enhanced_email
        except Exception as e:
            logger.warning(f"AI email enhancement failed: {e}")
    
    return {
        "subject": f"Pricing Discussion - Quote #{quotation_data.get('quotation_number', 'N/A')}",
        "body": email_content,
        "strategy": strategy.value,
        "tone": playbook["tone"],
        "suggested_response_days": 3 if strategy != NegotiationStrategy.URGENT else 1,
        "key_points": leverage_points,
        "target_savings": summary.get("total_potential_savings", 0),
        "target_savings_percent": summary.get("savings_percent", 0)
    }


async def enhance_email_with_ai(
    base_email: str,
    strategy: NegotiationStrategy,
    quotation_data: Dict,
    session_id: str
) -> Optional[str]:
    """Use AI to enhance the negotiation email"""
    if not EMERGENT_AVAILABLE or not EMERGENT_LLM_KEY:
        return None
    
    playbook = NEGOTIATION_PLAYBOOKS[strategy]
    
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"{session_id}_email",
            system_message=f"""You are an expert procurement negotiator. Your task is to refine and enhance negotiation emails.

The negotiation strategy is: {playbook['name']}
Tone should be: {playbook['tone']}
Key leverage points: {', '.join(playbook['leverage_points'])}

Rules:
1. Keep the email professional and concise
2. Maintain the core message and data points
3. Enhance persuasiveness without being aggressive
4. Ensure the tone matches the strategy
5. Keep it under 300 words
6. Return ONLY the enhanced email text, no explanations"""
        ).with_model("openai", "gpt-5.2")
        
        message = UserMessage(
            text=f"Please enhance this negotiation email while maintaining its core message:\n\n{base_email}"
        )
        
        response = await chat.send_message(message)
        return str(response).strip()
        
    except Exception as e:
        logger.error(f"AI email enhancement error: {e}")
        return None


def create_counter_offer(
    current_round: int,
    their_offer: float,
    our_last_offer: float,
    target_price: float,
    strategy: NegotiationStrategy
) -> Dict:
    """
    Calculate next counter-offer based on strategy and negotiation progress
    """
    playbook = NEGOTIATION_PLAYBOOKS[strategy]
    max_rounds = playbook["max_rounds"]
    concession_rate = playbook["concession_rate"]
    walk_away = playbook["walk_away_threshold"]
    
    # Calculate gap
    gap = their_offer - target_price
    rounds_remaining = max_rounds - current_round
    
    if rounds_remaining <= 0:
        # Final round - make best offer
        counter_offer = target_price * 1.02  # 2% above our target
    else:
        # Calculate concession based on remaining rounds
        concession = gap * (concession_rate * (max_rounds - rounds_remaining + 1))
        counter_offer = our_last_offer + concession
    
    # Ensure we don't exceed their offer
    counter_offer = min(counter_offer, their_offer * 0.98)
    
    # Check if we should walk away
    savings_from_original = (their_offer - counter_offer) / their_offer
    should_walk_away = savings_from_original < walk_away and current_round >= max_rounds - 1
    
    return {
        "round": current_round + 1,
        "their_offer": round(their_offer, 2),
        "our_counter": round(counter_offer, 2),
        "target_price": round(target_price, 2),
        "gap_to_target": round(their_offer - target_price, 2),
        "gap_to_counter": round(their_offer - counter_offer, 2),
        "rounds_remaining": rounds_remaining - 1,
        "should_walk_away": should_walk_away,
        "recommendation": "COUNTER" if not should_walk_away else "ESCALATE_OR_WALK",
        "message": get_counter_message(current_round, their_offer, counter_offer, strategy)
    }


def get_counter_message(round_num: int, their_offer: float, our_counter: float, strategy: NegotiationStrategy) -> str:
    """Generate appropriate message for counter-offer"""
    playbook = NEGOTIATION_PLAYBOOKS[strategy]
    
    if round_num == 1:
        return f"Thank you for your response. We appreciate the movement but believe ${our_counter:,.2f} better reflects market conditions."
    elif round_num == 2:
        return f"We're getting closer. Our revised position is ${our_counter:,.2f}. We're committed to finding a solution."
    else:
        return f"This is our best and final offer of ${our_counter:,.2f}. We hope to move forward together."


def get_all_strategies() -> List[Dict]:
    """Return all available negotiation strategies with details"""
    strategies = []
    for strategy, playbook in NEGOTIATION_PLAYBOOKS.items():
        strategies.append({
            "id": strategy.value,
            "name": playbook["name"],
            "description": playbook["description"],
            "target_discount": f"{playbook['target_discount']*100:.0f}%",
            "max_rounds": playbook["max_rounds"],
            "tone": playbook["tone"],
            "best_for": get_strategy_use_case(strategy)
        })
    return strategies


def get_strategy_use_case(strategy: NegotiationStrategy) -> str:
    """Get use case description for strategy"""
    use_cases = {
        NegotiationStrategy.AGGRESSIVE: "Commodity purchases, multiple supplier options, price-sensitive items",
        NegotiationStrategy.BALANCED: "Standard procurement, maintaining good supplier relations",
        NegotiationStrategy.RELATIONSHIP: "Strategic suppliers, specialized items, long-term partnerships",
        NegotiationStrategy.VOLUME_BASED: "Large orders, consolidation opportunities, framework agreements",
        NegotiationStrategy.URGENT: "Time-critical needs, emergency purchases, fast turnaround required"
    }
    return use_cases.get(strategy, "General procurement")
