import { useState } from "react";
import StateForm from "./StateForm";
import HookForm from "./HookForm";

export default function App() {
  const [run, setRun] = useState(0);

  return (
    <main>
      <h1>useState vs React Hook Form</h1>
      <p>Type in either form. The numbers show how many times each component has rendered.</p>
      <button onClick={() => setRun((r) => r + 1)}>Reset counts</button>
      <div className="panes">
        <section>
          <h2>useState</h2>
          <p>Each keystroke calls setState in the form, so the form and every field render again.</p>
          <StateForm key={`state-${run}`} />
        </section>
        <section>
          <h2>React Hook Form</h2>
          <p>Inputs keep their own values. The form renders again only when errors change or you submit.</p>
          <HookForm key={`hook-${run}`} />
        </section>
      </div>
    </main>
  );
}
