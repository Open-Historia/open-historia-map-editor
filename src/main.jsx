/*! Open Historia Map Editor — standalone entry © 2026 Nicholas Krol, MIT (see Editor/LICENSE). */
import { createRoot } from "react-dom/client";
import MapEditor from "./Editor/MapEditor.jsx";
import "./index.css";

// The editor renders full-screen and owns all its state; it needs no props (it
// opens on a blank map and saves/loads through the server). No StrictMode — the
// OpenLayers map doesn't like being mounted twice.
createRoot(document.getElementById("root")).render(<MapEditor />);
