import { tintDescription } from "./cardStats";

/** A card's text where what raises a stat is green and what lowers it is red. */
export function TintedText({ text }: { text: string }) {
  return (
    <>
      {tintDescription(text).map((part, index) =>
        part.tone ? (
          <span key={index} className="stat-tone" data-tone={part.tone}>
            {part.text}
          </span>
        ) : (
          <span key={index}>{part.text}</span>
        )
      )}
    </>
  );
}
