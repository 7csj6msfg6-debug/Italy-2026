TODAY TO WALLET DEEP-LINK UPDATE

What changed:
- The Wallet button on Today now finds the reservation matching the selected activity.
- Wallet opens and scrolls directly to that reservation card.
- The matched card briefly highlights so it is easy to spot.
- The button says Open ticket when a matching reservation exists.
- If no reliable match exists, it safely opens the Wallet without highlighting an unrelated card.
- Existing Wallet filters are cleared automatically when opening a matched card.

Deployment:
- Upload the app files to the repository root and replace existing versions.
- No tickets folder is included or required.
- Private Wallet attachments and other locally stored data remain unchanged.
