import { Link } from "react-router-dom";
import { Page, Section, List } from "../components/InfoPage";
import { openCookieSettings } from "../components/CookieConsent";

export default function Privacy() {
  return (
    <Page kicker="Legal" title="Privacy policy" updated="October 30, 2026">
      <p data-testid="privacy-intro">This policy explains what information GameRadar ("we", "us") collects when you use this website, how we use it, and the choices you have.</p>
      <Section title="Information we collect">
        <List items={[
          "Account details from Google Sign-In: your name, email address and profile picture, used to create your account.",
          "Content you create: your wishlist, game reviews and ratings, and your release-reminder setting.",
          "AI Guide chats: the questions you ask and the answers, stored so your conversation history is kept on your device's session.",
          "Contact form messages: the name, email and message you send us.",
          "Technical data: a sign-in cookie that keeps you logged in, and basic information your browser sends (such as IP address and browser type).",
        ]} />
      </Section>
      <Section title="How we use your information">
        <List items={[
          "To run the site: show your wishlist, reviews and chat history, and keep you signed in.",
          "To send release-day reminder emails for games on your wishlist (you can turn these off on your Wishlist page).",
          "To reply to messages you send through the contact form.",
          "To keep the site secure and working properly.",
        ]} />
        <p>We do not sell your personal information.</p>
      </Section>
      <Section title="Advertising and cookies">
        <p>We use Google AdSense to show ads. Google and its partners use cookies to serve ads based on your previous visits to this and other websites. Google's use of advertising cookies lets it and its partners serve ads to you based on your visits to GameRadar and/or other sites on the internet.</p>
        <p>You can opt out of personalised advertising in <a className="text-[#00F0FF] hover:underline" href="https://adssettings.google.com" target="_blank" rel="noreferrer">Google Ads Settings</a>, or learn more at <a className="text-[#00F0FF] hover:underline" href="https://policies.google.com/technologies/ads" target="_blank" rel="noreferrer">How Google uses information from sites that use its services</a>. Visitors in the EEA, UK and Switzerland are asked for consent before personalised ads are shown.</p>
        <button data-testid="privacy-cookie-settings-btn" onClick={openCookieSettings} className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold hover:border-[#FF9F1C] hover:text-[#FF9F1C]">Change cookie settings</button>
      </Section>
      <Section title="Third-party services">
        <List items={[
          "Google — sign-in and advertising (AdSense).",
          "RAWG.io — game information, images and trailers.",
          "CheapShark — PC game prices. Store links take you to third-party stores with their own policies.",
          "AI provider — your AI Guide questions are processed by an AI model to generate answers.",
          "Email delivery provider — used to send reminder emails.",
          "News links open articles on the publishers' own websites.",
        ]} />
      </Section>
      <Section title="Data retention and your rights">
        <p>We keep your account data while your account is active. You can remove wishlist items and delete your reviews at any time. To ask for a copy of your data or to have your account deleted, use our <Link to="/contact" className="text-[#00F0FF] hover:underline">contact page</Link>. Depending on where you live (for example under GDPR or CCPA), you may have rights to access, correct, delete or restrict the use of your data.</p>
      </Section>
      <Section title="Children">
        <p>GameRadar is not directed at children under 13, and we do not knowingly collect personal information from them.</p>
      </Section>
      <Section title="Changes">
        <p>We may update this policy from time to time. The "last updated" date at the top shows when it was last changed.</p>
      </Section>
    </Page>
  );
}
