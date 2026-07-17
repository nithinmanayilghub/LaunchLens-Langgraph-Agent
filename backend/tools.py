import json
from langchain_core.tools import tool

# Client helper imports
from backend.clients.serp_api import get_google_news, get_google_trends
from backend.clients.oxylabs import get_amazon_search, get_amazon_reviews
from backend.clients.constants import get_country_geo, get_amazon_domain


@tool
def google_trends_tool(keyword: str, country: str = "Global") -> str:
    """
    Query Google Trends interest over time and related queries for a product keyword.
    Use this to analyze consumer interest and search volume dynamics.
    """
    geo = get_country_geo(country)
    data = get_google_trends(keyword, country, geo)
    return json.dumps(data, indent=2)

@tool
def google_news_tool(keyword: str) -> str:
    """
    Query Google News for a product keyword to find recent market news, launches, and trends.
    """
    data = get_google_news(keyword)
    return json.dumps(data, indent=2)

@tool
def amazon_search_tool(keyword: str, country: str = "Global") -> str:
    """
    Search for product listings on Amazon to analyze top-selling brands, prices, and ratings.
    """
    domain = get_amazon_domain(country)
    data = get_amazon_search(keyword, domain=domain)
    return json.dumps(data, indent=2)

@tool
def amazon_reviews_tool(asin: str, keyword: str = "product", country: str = "Global") -> str:
    """
    Fetch customer reviews for a specific Amazon product ASIN to identify complaints, gaps, and pain points.
    """
    domain = get_amazon_domain(country)
    data = get_amazon_reviews(asin, keyword=keyword, domain=domain)
    return json.dumps(data, indent=2)
