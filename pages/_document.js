// pages/_document.js
import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="icon" href="/favicon.png" />
        <link rel="stylesheet" href="/assets/css/swiper-bundle.min.css" />
        <link rel="stylesheet" href="/assets/css/main.css" />
        <link rel="stylesheet" href="/assets/css/stories-slider.css" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
