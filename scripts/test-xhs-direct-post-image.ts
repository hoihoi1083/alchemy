import { readFileSync } from "fs";
import { fetchResearchPostByUrl } from "../lib/fetch-research-post-by-url";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim();
}

const url = process.argv[2] ?? "http://xhslink.com/o/9hxb7KLqxIV";

async function main() {
  const post = await fetchResearchPostByUrl(url, { mediaFilter: "image" });
  console.log("title:", post.title);
  console.log("cover:", post.coverImageUrl);
  const res = await fetch(post.coverImageUrl!, {
    headers: { Referer: "https://www.xiaohongshu.com/" },
  });
  console.log("direct fetch:", res.status, res.headers.get("content-type"));
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
