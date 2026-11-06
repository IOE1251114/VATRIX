import { site } from "../domain/site";

/** The copyright notice shown at the bottom of every page. The year updates itself. */
export function Copyright() {
  return (
    <p className="copyright">
      © {new Date().getFullYear()} {site.name} .
      All rights reserved. The text, visualizations and design of this site may
      not be copied, reproduced or redistributed without written permission.
    </p>
  );
}
