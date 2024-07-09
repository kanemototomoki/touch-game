import Canvas from "./_components/Canvas";

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-between mobile:max-w-[var(--screen-mobile)]">
      <Canvas />
    </main>
  );
}
