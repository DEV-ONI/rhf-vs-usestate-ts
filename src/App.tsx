import { useState } from "react";
import StateForm from "./StateForm";
import HookForm from "./HookForm";

export default function App() {
  const [run, setRun] = useState(0);

  return (
    <main>
      <header>
        <h1>useState vs React Hook Form</h1>
        <p>Type in either form. Each badge counts how many times that component has rendered.</p>
        <button className="ghost" onClick={() => setRun((r) => r + 1)}>
          Reset counts
        </button>
      </header>
      <div className="panes">
        <section className="pane state">
          <h2>useState</h2>
          <p className="why">Each keystroke calls setState in the form, so the form and every field render again.</p>
          <StateForm key={`state-${run}`} />
        </section>
        <section className="pane hook">
          <h2>React Hook Form</h2>
          <p className="why">Inputs keep their own values. The form renders again only when errors change or you submit.</p>
          <HookForm key={`hook-${run}`} />
        </section>
      </div>
    </main>
  );
}
