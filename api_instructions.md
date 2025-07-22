---
  📋 Complete Chrome Extension API Guide

  🔧 Updated APIs (now working with real summaries)

  1. RSS Topics - Get Individual Summaries

  GET /api/v1/extension/topics/{topic_id}/details
  Response (individual URLs with summaries):
  {
    "topic_id": "uuid",
    "topic_name": "Financial regulations",
    "meta_summary": "Overall topic summary",
    "last_updated": "2025-07-18",
    "feed_entries": [
      {
        "entry_id": "uuid",
        "title": "Article Title",
        "link": "https://ukwebfocus.wordpress.com/2009/07/06/...",
        "one_line_summary": "Brian Kelly's blog focuses on innovation and best practices...",
        "published_date": "2025-07-18T10:00:00Z",
        "tags": ["Financial", "Regulations"]
      }
    ],
    "total_entries": 1
  }

  2. Horizon Keywords - Get Individual Summaries

  GET /api/v1/extension/horizon/keywords/{keyword_id}/details
  Response (individual URLs with summaries):
  {
    "topic_id": "uuid",
    "topic_name": "Terrapay (Partner)",
    "meta_summary": "Meta summary combining all results",
    "last_updated": "2025-07-18",
    "feed_entries": [
      {
        "entry_id": "uuid",
        "title": "PayPal and TerraPay Partner...",
        "link": "https://www.prnewswire.com/news-releases/paypal-and-terrapay-partner...",
        "one_line_summary": "PayPal and TerraPay collaborate to enhance cross-border payments...",
        "published_date": "2025-07-18T10:00:00Z",
        "tags": ["Partner", "Terrapay"]
      }
    ],
    "total_entries": 1
  }

  ---
  🎯 Chrome Extension Implementation Guide

  1. Display Topic/Keyword Lists

  // Get topics with meta summaries
  const topicResponse = await fetch('/api/v1/extension/topics/summaries', {
    headers: { 'X-API-Key': userApiKey }
  });
  const topics = await topicResponse.json();

  // Get horizon keywords with meta summaries  
  const keywordResponse = await fetch('/api/v1/extension/horizon/keywords', {
    headers: { 'X-API-Key': userApiKey }
  });
  const keywords = await keywordResponse.json();

  // Display each topic/keyword with its meta summary
  topics.forEach(topic => {
    console.log(`Topic: ${topic.tag_name}`);
    console.log(`Meta Summary: ${topic.meta_summary}`);
  });

  2. Show Individual URLs When Topic Clicked

  // When user clicks on a topic
  const showTopicDetails = async (topicId) => {
    const response = await fetch(`/api/v1/extension/topics/${topicId}/details`, {
      headers: { 'X-API-Key': userApiKey }
    });
    const details = await response.json();

    // Display meta summary at top
    console.log(`Meta Summary: ${details.meta_summary}`);

    // Display individual URLs with summaries
    details.feed_entries.forEach(entry => {
      console.log(`URL: ${entry.link}`);
      console.log(`Summary: ${entry.one_line_summary}`);
    });
  };

  3. Show Individual URLs When Keyword Clicked

  // When user clicks on a horizon keyword
  const showKeywordDetails = async (keywordId) => {
    const response = await fetch(`/api/v1/extension/horizon/keywords/${keywordId}/details`, {
      headers: { 'X-API-Key': userApiKey }
    });
    const details = await response.json();

    // Display meta summary at top
    console.log(`Meta Summary: ${details.meta_summary}`);

    // Display individual URLs with summaries  
    details.feed_entries.forEach(entry => {
      console.log(`URL: ${entry.link}`);
      console.log(`Summary: ${entry.one_line_summary}`);
    });
  };