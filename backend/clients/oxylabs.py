import requests
from backend import config
from backend.cache import get_cached_query, set_cached_query

def query_oxylabs(source: str, query: str, domain: str = "com") -> dict:
    """Helper function to call the Oxylabs E-commerce API."""
    username = config.OXYLABS_USERNAME
    password = config.OXYLABS_PASSWORD
    
    if not username or not password:
        raise ValueError("OXYLABS_USERNAME or OXYLABS_PASSWORD not configured.")
        
    url = "https://realtime.oxylabs.io/v1/queries"
    auth = (username, password)
    
    payload = {
        "source": source,
        "domain": domain,
        "query": query,
        "parse": True
    }
    
    response = requests.post(url, auth=auth, json=payload, timeout=15)
    response.raise_for_status()
    return response.json()

def get_mock_amazon_search(keyword: str, domain: str) -> list:
    """Generates realistic mock product search results for testing without API keys."""
    # Standardize currency based on domain
    currency = "INR" if domain == "in" else "USD"
    price_symbol = "₹" if domain == "in" else "$"
    base_price = 1200 if domain == "in" else 25
    
    clean_kw = keyword.title()
    kw_prefix = (keyword[:3].upper() if len(keyword) >= 3 else "PRD").replace(" ", "X")
    
    return [
        {
            "asin": f"B07X{kw_prefix}011",
            "title": f"Premium {clean_kw} - Best Seller Edition",
            "price": base_price,
            "currency": currency,
            "rating": 4.6,
            "reviews_count": 1280,
            "url": f"https://www.amazon.{domain}/dp/B07X{kw_prefix}011"
        },
        {
            "asin": f"B08Y{kw_prefix}022",
            "title": f"Eco-Friendly {clean_kw} - High Quality & Durable",
            "price": int(base_price * 0.8),
            "currency": currency,
            "rating": 4.2,
            "reviews_count": 940,
            "url": f"https://www.amazon.{domain}/dp/B08Y{kw_prefix}022"
        },
        {
            "asin": f"B09Z{kw_prefix}033",
            "title": f"Professional {clean_kw} - Ergonomic & Sleek Design",
            "price": int(base_price * 1.25),
            "currency": currency,
            "rating": 4.7,
            "reviews_count": 3120,
            "url": f"https://www.amazon.{domain}/dp/B09Z{kw_prefix}033"
        }
    ]

def get_mock_amazon_reviews(asin: str, keyword: str) -> list:
    """Generates mock reviews focusing on typical pros/cons for e-commerce niches."""
    clean_kw = keyword.lower()
    return [
        {
            "title": "Excellent product, minor complaint",
            "rating": 4.0,
            "content": f"The performance of this {clean_kw} is absolutely brilliant. Exceeded my expectations. However, the outer build material feels a bit delicate and showed minor wear after a few weeks.",
            "is_verified": True
        },
        {
            "title": "Terrible quality, broke instantly",
            "rating": 2.0,
            "content": f"It worked fine for the first two days, but then it stopped functioning/broke after a light drop. Customer support is hard to reach. Do not recommend this {clean_kw}.",
            "is_verified": True
        },
        {
            "title": "Perfect purchase - highly recommend",
            "rating": 5.0,
            "content": f"Absolutely love it! The design is extremely sleek, and it performs exactly as advertised. Best {clean_kw} on the market by far.",
            "is_verified": True
        }
    ]

def get_amazon_search(keyword: str, domain: str = "com") -> list:
    """
    Searches products on Amazon for a keyword using Oxylabs.
    Checks SQLite cache first; falls back to Oxylabs or mock data.
    """
    cache_key = f"search:{keyword}:{domain}"
    cached = get_cached_query("amazon_search", cache_key)
    if cached:
        return cached

    username = config.OXYLABS_USERNAME
    password = config.OXYLABS_PASSWORD
    force_mock = config.OXYLABS_MOCK
    
    if username and password and not force_mock:
        try:
            res = query_oxylabs("amazon_search", keyword, domain)
            results = res.get("results", [])
            if results and isinstance(results, list) and len(results) > 0:
                first_result = results[0]
                content = first_result.get("content", {})
                if isinstance(content, dict):
                    results_inside = content.get("results", {})
                    if isinstance(results_inside, dict):
                        products = results_inside.get("organic", [])
                        
                        # Format and return the top products
                        formatted_products = []
                        for p in products[:5]:
                          if p.get("asin"):
                            formatted_products.append({
                                "asin": p.get("asin"),
                                "title": p.get("title"),
                                "price": p.get("price"),
                                "currency": p.get("currency"),
                                "rating": p.get("rating"),
                                "reviews_count": p.get("reviews_count"),
                                "url": p.get("url")
                            })
                        if formatted_products:
                            set_cached_query("amazon_search", cache_key, formatted_products)
                            return formatted_products
        except Exception as e:
            print(f"Oxylabs Amazon Search failed: {e}. Falling back to mock.")
            
    return get_mock_amazon_search(keyword, domain)

def get_amazon_reviews(asin: str, keyword: str = "product", domain: str = "com") -> list:
    """
    Fetches customer reviews for an ASIN using Oxylabs.
    Checks SQLite cache first; falls back to Oxylabs or mock data.
    """
    cache_key = f"reviews:{asin}:{domain}"
    cached = get_cached_query("amazon_reviews", cache_key)
    if cached:
        return cached

    username = config.OXYLABS_USERNAME
    password = config.OXYLABS_PASSWORD
    force_mock = config.OXYLABS_MOCK
    
    if username and password and not force_mock:
        try:
            res = query_oxylabs("amazon_product", asin, domain)
            results = res.get("results", [])
            if results and isinstance(results, list) and len(results) > 0:
                first_result = results[0]
                content = first_result.get("content", {})
                if isinstance(content, dict):
                    reviews = content.get("reviews", [])
                    
                    # Format and return the parsed reviews
                    formatted_reviews = []
                    for r in reviews[:5]:
                        formatted_reviews.append({
                            "title": r.get("title"),
                            "rating": r.get("rating"),
                            "content": r.get("content"),
                            "is_verified": r.get("is_verified")
                        })
                    if formatted_reviews:
                        set_cached_query("amazon_reviews", cache_key, formatted_reviews)
                        return formatted_reviews
        except Exception as e:
            print(f"Oxylabs Amazon Product Reviews failed: {e}. Falling back to mock.")
            
    return get_mock_amazon_reviews(asin, keyword)
