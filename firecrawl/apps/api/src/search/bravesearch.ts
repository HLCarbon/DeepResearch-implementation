import axios from "axios";
import dotenv from "dotenv";
import { SearchResult } from "../lib/entities";

dotenv.config();

export async function brave_api_search(
  q,
  options: {
    lang?: string;
    country?: string;
    location?: string;
  },
): Promise<SearchResult[]> {
  let data = JSON.stringify({
    q: q,
    search_lang: options.lang,
    country: options.country,
    location: options.location,
  });

  let config = {
    method: "GET",
    url: `https://api.search.brave.com/res/v1/web/search?q=${q}`,
    headers: {
      "X-Subscription-Token": process.env.BRAVE_API_KEY,
      "Content-Type": "application/json",
      "Accept":"application/json"
    }
  };
  //console.log(config)
  const response = await axios(config)
  .then(response => response.data)
  .catch(error => {
    if (error) {
      console.log(error);
      console.log(error.response.data);
      console.log(error.response.data.error);
      console.log(error.response.data.error.meta);
      console.log(error.response.data.error.meta.errors);
      console.log(error.response.data.error.meta.errors[0]);
      console.log(error.response.data.error.meta.errors[0].msg);
      console.log(error.response.data.error.meta.errors[0].loc);

    }
  });
  //console.log(response)
  //console.log(response.web)

  if (response && response.web && Array.isArray(response.web.results)) {
    return response.web.results.map((a) => ({
      url: a.url,
      title: a.title,
      description: a.description,
    }));
  } else {
    return [];
  }
}
