import { Link } from "react-router-dom";
import { Page, Section, List } from "../components/InfoPage";

export default function About() {
  return (
    <Page kicker="Who we are" title="About GameRadar">
      <p className="text-lg text-slate-200" data-testid="about-intro">GameRadar is a free hub for gamers who want everything about games in one place — what's just launched, what's coming, what everyone is playing, and whether it's worth your time and money.</p>
      <Section title="What you'll find here">
        <List items={[
          "New releases for PS5, Xbox Series, PC and Switch, updated daily.",
          "Top charts: trending games, most played of all time and top rated.",
          "A release calendar for the next 12 months and live showcase countdowns.",
          "A news feed from official platform blogs and major gaming sites.",
          "Detailed game pages with trailers, screenshots, PC requirements, the best PC prices and player reviews.",
          "Side-by-side game comparisons and Radar AI, a game guide that answers your questions.",
        ]} />
      </Section>
      <Section title="Where our data comes from">
        <p>Game information and images come from the RAWG video game database. PC prices come from CheapShark. News headlines link to the original articles on PlayStation Blog, Xbox Wire, IGN, GameSpot, PC Gamer and Nintendo news sites. Trademarks and game artwork belong to their respective owners.</p>
      </Section>
      <Section title="Get in touch">
        <p>Spotted a mistake, have a feature idea or want to work with us? <Link to="/contact" className="text-[#00F0FF] hover:underline" data-testid="about-contact-link">Send us a message</Link>.</p>
      </Section>
    </Page>
  );
}
