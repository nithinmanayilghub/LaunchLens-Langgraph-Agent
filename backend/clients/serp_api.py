import requests
from backend import config
from backend.cache import get_cached_query, set_cached_query

def query_serpapi(engine: str, params: dict) -> dict:
    """Helper function to call SerpApi endpoints."""
    api_key = config.SERP_API_KEY
    if not api_key:
        raise ValueError("SERP_API_KEY not found in environment.")
    
    url = "https://serpapi.com/search"
    query_params = {
        **params,
        "engine": engine,
        "api_key": api_key
    }
    response = requests.get(url, params=query_params, timeout=10)
    response.raise_for_status()
    return response.json()

def get_mock_google_trends(keyword: str, country: str) -> dict:
    """Fallback mock data for Google Trends."""
    return {
        "interest_over_time": [
            {"date": "Jan 2026", "value": "60"},
            {"date": "Mar 2026", "value": "75"},
            {"date": "May 2026", "value": "90"},
            {"date": "Jul 2026", "value": "100"}
        ],
        "rising_queries": [
            {"query": f"best {keyword}", "value": "+120%"},
            {"query": f"eco friendly {keyword}", "value": "+80%"}
        ],
        "top_queries": [
            {"query": f"cheap {keyword}", "value": "100"},
            {"query": f"buy {keyword}", "value": "75"}
        ]
    }

def get_mock_google_news(keyword: str) -> list:
    """Fallback mock data for Google News."""
    return [
        {
            "title": f"The Rising Trend of Smart {keyword}s",
            "source": "TechCrunch",
            "date": "2 weeks ago",
            "snippet": f"Startups are innovating rapidly in the {keyword} space, adding smart temperature control and sustainable materials."
        },
        {
            "title": f"Market Analysis: {keyword} Industry Forecast",
            "source": "Bloomberg",
            "date": "1 month ago",
            "snippet": f"The global market for {keyword}s is expected to grow by 12% CAGR over the next five years due to shifting consumer preferences."
        }
    ]

def get_google_trends(keyword: str, country: str, geo: str = None) -> dict:
    """
    Fetches search interest over time and related queries for a keyword.
    Checks SQLite cache first; falls back to SerpApi or mock data.
    """
    cache_key = f"trends:{keyword}:{country}:{geo or 'none'}"
    cached = get_cached_query("google_trends", cache_key)
    if cached:
        return cached

    api_key = config.SERP_API_KEY
    if api_key:
        try:
            trends_params = {"q": keyword, "engine": "google_trends"}
            if geo:
                trends_params["geo"] = geo
            trends_res = query_serpapi("google_trends", trends_params)
            result = {
                "interest_over_time": trends_res.get("interest_over_time", {}).get("timeline_data", [])[-5:], 
                "rising_queries": trends_res.get("related_queries", {}).get("rising", [])[:3],
                "top_queries": trends_res.get("related_queries", {}).get("top", [])[:3]
            }
            set_cached_query("google_trends", cache_key, result)
            return result
        except Exception as e:
            print(f"SerpApi Google Trends failed: {e}. Falling back to mock data.")
            
    return get_mock_google_trends(keyword, country)

def get_google_news(keyword: str) -> list:
    """
    Fetches latest news results for a keyword.
    Checks SQLite cache first; falls back to SerpApi.
    """
    cache_key = f"news:{keyword}"
    cached = get_cached_query("google_news", cache_key)
    if cached:
        return cached

    api_key = config.SERP_API_KEY
    if api_key:
        try:
            news_res = query_serpapi("google_news", {"q": keyword})
            result = [
                {
                    "title": item.get("title"),
                    "source": item.get("source"),
                    "date": item.get("date"),
                    "snippet": item.get("snippet")
                }
                for item in news_res.get("news_results", [])[:3]
            ]
            set_cached_query("google_news", cache_key, result)
            return result
        except Exception as e:
            print(f"SerpApi Google News failed: {e}.")
            
    return [
        {
            "status": "unavailable",
            "message": "Google News data is currently unavailable. No SerpApi queries could be executed."
        }
    ]
