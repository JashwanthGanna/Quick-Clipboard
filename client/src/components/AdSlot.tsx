interface AdSlotProps {
  slot?: string;
  format?: "auto" | "horizontal" | "vertical" | "rectangle";
  className?: string;
}

/**
 * Placeholder component for Google AdSense ad slots.
 * Renders a clearly marked placeholder div that can be activated
 * once you have a valid AdSense publisher ID.
 * 
 * To activate:
 * 1. Replace ca-pub-XXXXXXXXXX in index.html with your publisher ID
 * 2. Uncomment the AdSense script in index.html
 * 3. Replace the placeholder div below with an actual <ins> tag
 */
export default function AdSlot({ slot = "XXXXXXXXXX", format = "auto", className = "" }: AdSlotProps) {
  return (
    <div
      className={`w-full flex items-center justify-center ${className}`}
      aria-hidden="true"
      role="presentation"
    >
      {/* 
        Google AdSense Placeholder
        
        When ready to activate ads, replace this comment block with:
        
        <ins className="adsbygoogle"
          style={{ display: "block" }}
          data-ad-client="ca-pub-XXXXXXXXXX"
          data-ad-slot={slot}
          data-ad-format={format}
          data-full-width-responsive="true"
        />
        
        And call: (window.adsbygoogle = window.adsbygoogle || []).push({});
      */}
    </div>
  );
}
