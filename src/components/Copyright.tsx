import { site } from "../domain/site";

/** The copyright notice shown at the bottom of every page. The year updates itself. */
export function Copyright() {
  return (
    <p className="copyright">
      Copyright © {new Date().getFullYear()} {site.name} .
      All rights reserved.
    </p>
  );
}
