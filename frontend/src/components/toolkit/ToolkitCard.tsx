import { Link } from 'react-router-dom';
import type { ToolkitCardDef } from '../../content/toolkit';

/**
 * Landing-page tool tile. The whole card is the link so the provider reaches
 * the tool in one click (skeleton §1 design principle).
 */
export function ToolkitCard({ card }: { card: ToolkitCardDef }) {
  return (
    <li className="tool-card">
      <Link to={card.to} className="tool-card__link">
        <h3 className="tool-card__title">{card.title}</h3>
        <p className="tool-card__purpose">{card.purpose}</p>
        <span className="tool-card__cta">
          {card.cta}
          <span aria-hidden="true"> →</span>
        </span>
      </Link>
    </li>
  );
}
