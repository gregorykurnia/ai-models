"use client";
export default function ErrorPage({ reset }: { reset: () => void }) { return <section className="panel error"><h1>Unable to load this data</h1><p>The snapshot could not be read. Please try again.</p><button onClick={reset}>Try again</button></section>; }
