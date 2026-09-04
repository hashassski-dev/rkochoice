# Legal checklist for the RKO showcase (Russia, review date: 2026-09-04)

This is a technical/compliance checklist, not a substitute for a Russian advertising/privacy lawyer reviewing your exact contracts and traffic model.

## Already adjusted in the site

- The public page states that the service is an informational showcase and is not a bank.
- Partner-link disclosure is shown when a card has a partner URL.
- Admin has fields for `Рекламодатель`, `erid`, and `Маркировать как рекламу`.
- The site does not invent or generate an `erid`.
- Price language is softened: users are told that final tariffs, commissions and limits are determined by the bank.
- No lead form, phone field, INN field, tracker or third-party analytics is included in the public build.
- Public legal/privacy pages were added.

## Must be completed by the owner before public launch

1. Fill owner/operator details in `site/legal.html` and `site/privacy.html`.
2. Decide with each partner network whether each placement is advertising or an informational catalog placement. Keep the cards visually uniform if relying on catalog/informational treatment.
3. For placements treated as internet advertising, obtain the required advertising identifier through the proper ORD flow and fill `Рекламодатель` + `erid` in the admin card.
4. For financial-service advertising, use the actual legal name of the entity providing the financial service and avoid incomplete or misleading price claims.
5. If any lead form or CRM integration is later added to the website, implement a full personal-data process before launch: legal basis/consent where required, public PD policy, retention/deletion rules, access control, incident handling, localization requirements and Roskomnadzor notification analysis.
6. Do not publish invented reviews, fake scarcity, guaranteed earnings, or claims that opening multiple accounts guarantees a payout.
7. Affiliate-program rules take priority for traffic sources. A source forbidden by the offer must not be disguised as a permitted source.

## Operating rule for handlers

Handlers may help a lead describe their actual business clearly, but must not create a fictitious business story, false turnover, false counterparties or technical transactions designed only to imitate business activity. Banking and partner-program questions must be answered with factual information.
