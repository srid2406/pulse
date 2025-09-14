import dayjs from "dayjs";
import content from "../components/tiptap-templates/simple/data/content.json";

export const getDefaultContent = (date: string) => {
  const formatted = dayjs(date).format("dddd, MMM D, YYYY");

  const cloned = JSON.parse(JSON.stringify(content));

  const replacePlaceholders = (node: any) => {
    if (node?.type === "text" && node.text === "<DATE_PLACEHOLDER>") {
      node.text = formatted;
    }
    if (Array.isArray(node?.content)) {
      node.content.forEach(replacePlaceholders);
    }
  };

  replacePlaceholders(cloned);

  return cloned;
};
