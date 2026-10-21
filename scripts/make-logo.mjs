/**
 * Hilal brend loqosu — public/hilal-logo.png (768×240, retina-dostu)
 * Rənglər: tünd bənövşəyi/tünd qırmızı #4a1c2c + hover #381420, ağ, açıq qızılı aksand.
 */
import sharp from "sharp";

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="768" height="240" viewBox="0 0 768 240">
  <defs>
    <linearGradient id="sq" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#5a2338"/>
      <stop offset="1" stop-color="#4a1c2c"/>
    </linearGradient>
  </defs>

  <!-- Emblem -->
  <rect x="16" y="20" width="200" height="200" rx="44" fill="url(#sq)"/>

  <!-- Crescent (ay) -->
  <mask id="crescent">
    <circle cx="116" cy="102" r="62" fill="white"/>
    <circle cx="140" cy="86" r="54" fill="black"/>
  </mask>
  <circle cx="116" cy="102" r="62" fill="#ffffff" mask="url(#crescent)"/>

  <!-- Ulduz -->
  <path d="M150 62 l5.5 15.5 15.5 5.5 -15.5 5.5 -5.5 15.5 -5.5 -15.5 -15.5 -5.5 15.5 -5.5 z" fill="#e7c99b" transform="rotate(8 155 83)"/>

  <!-- Open book -->
  <path d="M58 138 C78 124 102 128 114 140 L114 186 C102 174 78 170 58 184 Z" fill="#ffffff"/>
  <path d="M170 138 C150 124 126 128 118 140 L118 186 C126 174 150 170 170 184 Z" fill="#ffffff" opacity="0.92"/>

  <!-- Wordmark -->
  <text x="252" y="128" font-family="Georgia, 'Times New Roman', serif" font-weight="700" font-size="88" fill="#4a1c2c">Hilal</text>
  <text x="256" y="176" font-family="Helvetica, Arial, sans-serif" font-weight="600" font-size="30" letter-spacing="10" fill="#4a1c2c" opacity="0.82">KURSLARI</text>
  <rect x="252" y="196" width="196" height="5" rx="2.5" fill="#e7c99b"/>
</svg>
`;

await sharp(Buffer.from(svg))
  .png()
  .toFile("public/hilal-logo.png")
  .then((info) => console.log("OK", info.width, "x", info.height, info.format))
  .catch((e) => {
    console.error("FAIL", e.message);
    process.exit(1);
  });
