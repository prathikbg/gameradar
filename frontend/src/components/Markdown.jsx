import DOMPurify from "dompurify";

const inline = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/_(.+?)_/g, "<em>$1</em>");

const toHtml = (text) => {
  const out = [];
  let list = null;
  const close = () => { if (list) { out.push(`</${list}>`); list = null; } };
  text.split("\n").forEach((line) => {
    const ul = line.match(/^\s*[-*•]\s+(.*)/);
    const ol = line.match(/^\s*\d+[.)]\s+(.*)/);
    const h = line.match(/^(#{1,3})\s+(.*)/);
    if (ul || ol) {
      const t = ul ? "ul" : "ol";
      if (list !== t) { close(); out.push(`<${t}>`); list = t; }
      out.push(`<li>${inline((ul || ol)[1])}</li>`);
    } else {
      close();
      if (h) out.push(`<h3>${inline(h[2])}</h3>`);
      else if (line.trim()) out.push(`<p>${inline(line)}</p>`);
    }
  });
  close();
  return out.join("");
};

export default function Markdown({ text }) {
  const html = DOMPurify.sanitize(toHtml(text), { ALLOWED_TAGS: ["p", "ul", "ol", "li", "h3", "strong", "em"], ALLOWED_ATTR: [] });
  return <div className="prose-ai" dangerouslySetInnerHTML={{ __html: html }} />;
}
