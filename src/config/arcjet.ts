import arcjet, {shield, detectBot, slidingWindow} from "@arcjet/node";

if (!process.env.ARCJET_KEY && process.env.ARCJET_ENV !== "test") {
  throw new Error("ARCJET_KEY env is required");
}

 const aj = arcjet({
  key: process.env.ARCJET_KEY!,
  rules: [
    // Shield protects your app from common attacks e.g. SQL injection
    shield({ mode: "LIVE" }),
    // Create a bot detection rule
    detectBot({
      mode: "LIVE", 
      allow: [
        "CATEGORY:SEARCH_ENGINE", 
        "CATEGORY:PREVIEW", 
      ],
    }),
    // Create a token bucket rate limit. Other algorithms are supported.
   slidingWindow({
        mode: "LIVE",
        interval: "2s",
        max: 5,
    }),
  ],
});

export default aj;
