import {
  PrototypeGrid,
  PrototypePanel,
} from "../_components/prototype-primitives";
import styles from "./foundation-baseline.module.css";

export function FoundationBaseline() {
  return (
    <PrototypeGrid>
      <PrototypePanel label="Reading surface">
        <div className={styles.specimen}>
          <p className={styles.kicker}>Technical note / 01</p>
          <h3 className={styles.title}>Clarity before decoration.</h3>
          <p className={styles.body}>
            A compact content specimen checks heading rhythm, reading width,
            subdued copy, and code styling without implying a final Lab design.
          </p>
          <code className={styles.code}>prototype.status = &quot;provisional&quot;</code>
        </div>
      </PrototypePanel>

      <PrototypePanel label="Native interaction" tone="muted">
        <div className={styles.specimen}>
          <p className={styles.kicker}>Behavior / disclosure</p>
          <h3 className={styles.title}>Start with the platform.</h3>
          <p className={styles.body}>
            This comparison uses a native disclosure to exercise hover, focus,
            open, and keyboard behavior without client JavaScript.
          </p>
          <details className={styles.disclosure}>
            <summary>Inspect the rationale</summary>
            <p>
              A component dependency is not justified by this specimen. Revisit
              that decision only when repeated behavior or accessibility needs
              exceed the native element.
            </p>
          </details>
        </div>
      </PrototypePanel>
    </PrototypeGrid>
  );
}
