export default function StructuredData() {
    const structuredData = {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        "name": "WhatsApp Web",
        "description": "Inicia sesión en WhatsApp Web para enviar mensajes de forma sencilla, fiable y privada en tu ordenador. Envía y recibe mensajes y archivos fácilmente y totalmente gratis.",
        "applicationCategory": "CommunicationApplication",
        "operatingSystem": "All",
        "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD"
        },
        "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.5",
            "ratingCount": "1000000"
        },
        "author": {
            "@type": "Organization",
            "name": "WhatsApp",
            "url": "https://www.whatsapp.com"
        },
        "datePublished": "2015-01-21",
        "softwareVersion": "2.0",
        "browserRequirements": "Requires JavaScript. Requires HTML5.",
        "screenshot": "/logo.png",
        "image": "/logo.png"
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
    );
}
