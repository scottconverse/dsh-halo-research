/*
 * Halo Router client surface.
 *
 * This is intentionally a stock DSH client entry: it contributes one additive
 * shell.overlay cell and talks to the host only through the generated
 * haloRouting Remote namespace. It does not replace the sidebar, conversation,
 * model picker, or settings surfaces.
 */
window.__ModuleLoader__.load({
  id: "@deepseek-ai/dsh-halo-routing-ui",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    const React = require("react");
    const h = React.createElement;
    const {
      useCallback,
      useEffect,
      useMemo,
      useRef,
      useState,
    } = React;

    const POLL_MS = 15000;
    const OPTION_LIMIT = 40;
    const CATALOG_PREVIEW_LIMIT = 8;

    const inject = ["slots", "remote", "sessions"];

    // Generated-artifact-compatible strict codecs kept local to this DEV UI
    // entry. They validate the wire envelope without importing Zod into the
    // browser module table. The host adapter is source-discovered by Typert.
    const objectSchema = (name, validate) => ({
      parse(value) {
        if (!value || typeof value !== "object" || Array.isArray(value)) {
          throw new TypeError(`${name} must be an object`);
        }
        return validate(value);
      },
    });
    const requestSchema = objectSchema("haloRouting request", (value) => {
      if (value.sessionId !== undefined && typeof value.sessionId !== "string") {
        throw new TypeError("sessionId must be a string");
      }
      return value;
    });
    const configureSchema = objectSchema("haloRouting configure request", (value) => {
      if (value.sessionId !== undefined && typeof value.sessionId !== "string") {
        throw new TypeError("sessionId must be a string");
      }
      if (!value.settings || typeof value.settings !== "object" || Array.isArray(value.settings)) {
        throw new TypeError("settings must be an object");
      }
      if (value.settings.mode !== undefined && ! ["automatic", "manual"].includes(value.settings.mode)) {
        throw new TypeError("settings.mode is invalid");
      }
      if (value.settings.scope !== undefined && ! ["local-first", "local-only"].includes(value.settings.scope)) {
        throw new TypeError("settings.scope is invalid");
      }
      for (const role of ["planner", "worker"]) {
        if (value.settings[role] !== undefined && value.settings[role] !== null && typeof value.settings[role] !== "string") {
          throw new TypeError(`settings.${role} must be a candidate id or null`);
        }
      }
      return value;
    });
    const snapshotSchema = objectSchema("haloRouting status", (value) => {
      if (!Array.isArray(value.candidates) || !Array.isArray(value.recent)) {
        throw new TypeError("status must contain candidates and recent arrays");
      }
      return value;
    });
    const TYPERT_REMOTE = {
      package: "@deepseek-ai/dsh-halo-routing-ui",
      descriptors: [
        {
          id: "@deepseek-ai/dsh-halo-routing-ui#haloRouting/status",
          service: "haloRoutingRemote",
          namespace: "haloRouting",
          method: "status",
          invocation: { kind: "direct" },
          parameters: [{ name: "request", wire: "request", source: "json", codec: { mode: "strict", typeSymbol: "@deepseek-ai/dsh-halo-routing-ui/request", schema: requestSchema } }],
          result: { mode: "strict", typeSymbol: "@deepseek-ai/dsh-halo-routing-ui/status", schema: snapshotSchema },
        },
        {
          id: "@deepseek-ai/dsh-halo-routing-ui#haloRouting/configure",
          service: "haloRoutingRemote",
          namespace: "haloRouting",
          method: "configure",
          invocation: { kind: "direct" },
          parameters: [{ name: "request", wire: "request", source: "json", codec: { mode: "strict", typeSymbol: "@deepseek-ai/dsh-halo-routing-ui/configure", schema: configureSchema } }],
          result: { mode: "strict", typeSymbol: "@deepseek-ai/dsh-halo-routing-ui/status", schema: snapshotSchema },
        },
      ],
    };

    const styles = {
      host: {
        position: "fixed",
        top: 14,
        right: 18,
        width: "min(420px, calc(100vw - 28px))",
        zIndex: 1000,
        pointerEvents: "auto",
        fontFamily: "inherit",
        color: "var(--dsh-color-text, #e7e9ee)",
      },
      button: {
        border: "1px solid color-mix(in srgb, currentColor 24%, transparent)",
        borderRadius: 999,
        padding: "7px 12px",
        background: "color-mix(in srgb, var(--dsh-color-panel, #20242b) 92%, transparent)",
        color: "inherit",
        cursor: "pointer",
        boxShadow: "0 5px 18px rgb(0 0 0 / 22%)",
        font: "inherit",
        fontSize: 12,
        fontWeight: 650,
        display: "block",
        marginLeft: "auto",
      },
      panel: {
        position: "fixed",
        top: 54,
        right: 14,
        width: "min(420px, calc(100vw - 28px))",
        boxSizing: "border-box",
        maxHeight: "min(760px, calc(100vh - 80px))",
        overflow: "auto",
        marginTop: 8,
        padding: 16,
        border: "1px solid color-mix(in srgb, currentColor 17%, transparent)",
        borderRadius: 14,
        background: "var(--dsh-color-panel, #20242b)",
        boxShadow: "0 16px 45px rgb(0 0 0 / 34%)",
        fontSize: 13,
      },
      title: { margin: 0, fontSize: 16, lineHeight: 1.2 },
      muted: { color: "color-mix(in srgb, currentColor 64%, transparent)" },
      row: { display: "grid", gap: 5, marginTop: 12 },
      label: { fontSize: 11, fontWeight: 650, letterSpacing: ".02em" },
      select: {
        width: "100%",
        minHeight: 31,
        borderRadius: 7,
        border: "1px solid color-mix(in srgb, currentColor 20%, transparent)",
        background: "var(--dsh-color-input, #171a20)",
        color: "inherit",
        padding: "5px 7px",
        font: "inherit",
      },
      input: {
        width: "100%",
        boxSizing: "border-box",
        minHeight: 31,
        borderRadius: 7,
        border: "1px solid color-mix(in srgb, currentColor 20%, transparent)",
        background: "var(--dsh-color-input, #171a20)",
        color: "inherit",
        padding: "5px 7px",
        font: "inherit",
      },
      action: {
        border: "1px solid color-mix(in srgb, currentColor 22%, transparent)",
        borderRadius: 7,
        padding: "6px 9px",
        background: "transparent",
        color: "inherit",
        cursor: "pointer",
        font: "inherit",
        fontSize: 12,
      },
      primary: {
        background: "var(--dsh-color-accent, #6ea8fe)",
        color: "var(--dsh-color-accent-contrast, #07111f)",
        borderColor: "transparent",
        fontWeight: 650,
      },
      error: {
        marginTop: 11,
        padding: "8px 10px",
        borderRadius: 8,
        background: "color-mix(in srgb, #ef6b73 15%, transparent)",
        color: "#ffb4ba",
      },
      card: {
        marginTop: 12,
        padding: "9px 10px",
        borderRadius: 9,
        background: "color-mix(in srgb, currentColor 6%, transparent)",
      },
    };

    function currentSessionId(sessions) {
      try {
        return sessions?.list?.getSnapshot?.().current;
      } catch {
        return undefined;
      }
    }

    function failureMessage(error) {
      if (error instanceof Error && error.message) return error.message;
      if (typeof error === "string") return error;
      return "Router status is unavailable.";
    }

    function remoteValue(result) {
      if (result && result.ok === false) {
        throw new Error(result.error?.message || "Router request was rejected.");
      }
      return result?.ok === true && Object.hasOwn(result, "value") ? result.value : result;
    }

    function candidateLabel(candidate) {
      const provider = candidate?.provider || "unknown provider";
      const model = candidate?.model || "unknown model";
      return candidate?.label || `${provider} / ${model}`;
    }

    function localityLabel(candidate) {
      const locality = candidate?.locality || "unknown locality";
      const state = candidate?.catalogState;
      return state && state !== "ready" ? `${locality} · ${state}` : locality;
    }

    function formatDecisionEndpoint(endpoint) {
      if (!endpoint) return "—";
      if (typeof endpoint === "string") return endpoint;
      if (typeof endpoint !== "object") return String(endpoint);
      const identity = [endpoint.provider, endpoint.model].filter(Boolean).join(" / ");
      const fallback = endpoint.candidateId || "—";
      return endpoint.reasoningEffort
        ? `${identity || fallback} · ${endpoint.reasoningEffort}`
        : identity || fallback;
    }

    function candidateSearchText(candidate) {
      return [
        candidate?.candidateId,
        candidate?.label,
        candidate?.provider,
        candidate?.model,
        candidate?.locality,
        candidate?.catalogState,
      ].filter(Boolean).join(" ").toLocaleLowerCase();
    }

    function candidatePriority(candidate) {
      const qualifications = candidate?.qualification || {};
      const qualified = Object.values(qualifications).some((value) => value === "pass");
      const ready = !candidate?.catalogState || candidate.catalogState === "ready";
      const local = candidate?.locality === "local";
      return (qualified ? 4 : 0) + (ready ? 2 : 0) + (local ? 1 : 0);
    }

    function visibleCandidates(candidates, query = "", selected, limit = OPTION_LIMIT) {
      const all = Array.isArray(candidates) ? candidates : [];
      const needle = query.trim().toLocaleLowerCase();
      const selectedCandidate = all.find((candidate) => candidate.candidateId === selected);
      const matches = all
        .filter((candidate) => !needle || candidateSearchText(candidate).includes(needle))
        .map((candidate, index) => ({ candidate, index }))
        .sort((left, right) => candidatePriority(right.candidate) - candidatePriority(left.candidate) || left.index - right.index)
        .map(({ candidate }) => candidate);
      const bounded = matches.slice(0, Math.max(1, limit));
      if (!selectedCandidate || bounded.some((candidate) => candidate.candidateId === selected)) return bounded;
      return [selectedCandidate, ...bounded.slice(0, Math.max(0, limit - 1))];
    }

    function routerBadge(snapshot, phase) {
      if (snapshot) return snapshot.settings?.mode === "automatic" ? "Auto" : "Manual";
      return phase === "error" ? "Unavailable" : "Loading";
    }

    function formatTimestamp(value) {
      if (!value) return "Time unavailable";
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
    }

    function humanRoleLabel(role) {
      if (role === "analysis" || role === "planner") return "Planner";
      if (role === "structured_write" || role === "worker") return "Coding worker";
      return role || "Request";
    }

    function shortReason(reason, limit = 140) {
      if (typeof reason !== "string") return "";
      const value = reason.trim();
      if (value.length <= limit) return value;
      return `${value.slice(0, Math.max(1, limit - 1)).trimEnd()}…`;
    }

    function choiceOptions(candidates, selected) {
      const options = [
        h("option", { key: "automatic", value: "" }, "Automatic selection"),
        ...(candidates || []).map((candidate) => h(
          "option",
          { key: candidate.candidateId, value: candidate.candidateId },
          `${candidateLabel(candidate)} · ${localityLabel(candidate)}`,
        )),
      ];
      if (selected && !(candidates || []).some((candidate) => candidate.candidateId === selected)) {
        options.splice(1, 0, h("option", { key: `selected-${selected}`, value: selected }, `${selected} · saved override`));
      }
      return options;
    }

    function RouterOverlay({ remote, sessions, placement = "overlay" }) {
      const [open, setOpen] = useState(false);
      const [phase, setPhase] = useState("loading");
      const [snapshot, setSnapshot] = useState(null);
      const [error, setError] = useState(null);
      const [saving, setSaving] = useState(false);
      const [plannerSearch, setPlannerSearch] = useState("");
      const [workerSearch, setWorkerSearch] = useState("");
      const [, bumpSessionRevision] = useState(0);
      const triggerRef = useRef(null);
      const sessionId = currentSessionId(sessions);
      // A session generation plus request sequence rejects both cross-session
      // replies (including A -> B -> A) and pre-save polling responses.
      const requestRef = useRef({ sessionId, sequence: 0, ready: Boolean(snapshot), saving: false });
      if (requestRef.current.sessionId !== sessionId) {
        requestRef.current = { sessionId, sequence: requestRef.current.sequence + 1, ready: false, saving: false };
      }
      const currentSnapshot = requestRef.current.ready ? snapshot : null;
      const visibleHere = placement === "header" ? Boolean(sessionId) : !sessionId;
      const api = remote?.haloRouting;

      const load = useCallback(async (background = false) => {
        const owner = requestRef.current;
        if (owner.sessionId !== sessionId || currentSessionId(sessions) !== sessionId || owner.saving) return;
        const sequence = ++owner.sequence;
        const isCurrent = () => requestRef.current === owner && owner.sequence === sequence && currentSessionId(sessions) === sessionId;
        if (!background || !owner.ready) setPhase("loading");
        if (!background) setError(null);
        try {
          if (typeof api?.status !== "function") {
            throw new Error("Halo Router Remote is not mounted in this production profile.");
          }
          const request = sessionId ? { sessionId } : {};
          const nextSnapshot = remoteValue(await api.status(request));
          if (!isCurrent()) return;
          setSnapshot(nextSnapshot);
          owner.ready = true;
          setPhase("ready");
          if (background) setError((current) => current?.kind === "load" ? null : current);
        } catch (cause) {
          if (!isCurrent()) return;
          if (!owner.ready) setPhase("error");
          setError((current) => current?.kind === "save"
            ? current
            : { kind: "load", message: failureMessage(cause) });
        }
      }, [api, sessionId, sessions]);

      useEffect(() => {
        if (!visibleHere) return undefined;
        setError(null);
        setSaving(false);
        void load();
        const timer = setInterval(() => void load(true), POLL_MS);
        const owner = requestRef.current;
        return () => { clearInterval(timer); owner.sequence += 1; };
      }, [load, visibleHere]);

      useEffect(() => {
        if (!sessions?.list?.subscribe) return undefined;
        return sessions.list.subscribe(() => {
          // Recompute the current id before the status effect runs. Calling
          // the old `load` closure here could query the session we just left.
          bumpSessionRevision((revision) => revision + 1);
        });
      }, [sessions]);

      useEffect(() => {
        if (!open) return undefined;
        const onKeyDown = (event) => {
          if (event.key !== "Escape") return;
          setOpen(false);
          triggerRef.current?.focus?.();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
      }, [open]);

      const candidates = currentSnapshot?.candidates || [];
      const settings = currentSnapshot?.settings || {};
      const recent = currentSnapshot?.recent || [];
      const latestDecision = recent[0];
      const olderDecisions = recent.slice(1, 7);
      const defaults = currentSnapshot?.defaults;
      const sessionSpecific = currentSnapshot?.sessionspecific ?? currentSnapshot?.sessionSpecific;
      const badge = routerBadge(currentSnapshot, phase);

      const configure = useCallback(async (patch) => {
        const owner = requestRef.current;
        if (typeof api?.configure !== "function" || !owner.ready || owner.saving || owner.sessionId !== sessionId || currentSessionId(sessions) !== sessionId) return;
        const sequence = ++owner.sequence;
        const isCurrent = () => requestRef.current === owner && owner.sequence === sequence && currentSessionId(sessions) === sessionId;
        owner.saving = true;
        setSaving(true);
        setError(null);
        try {
          const request = {
            ...(sessionId ? { sessionId } : {}),
            settings: patch,
          };
          const nextSnapshot = remoteValue(await api.configure(request));
          if (!isCurrent()) return;
          setSnapshot(nextSnapshot);
          setPhase("ready");
        } catch (cause) {
          if (!isCurrent()) return;
          setError({ kind: "save", message: failureMessage(cause) });
        } finally {
          if (isCurrent()) { owner.saving = false; setSaving(false); }
        }
      }, [api, sessionId, sessions]);

      const roleCandidates = useMemo(() => ({
        planner: visibleCandidates(candidates, plannerSearch, settings.planner),
        worker: visibleCandidates(candidates, workerSearch, settings.worker),
      }), [candidates, plannerSearch, settings.planner, settings.worker, workerSearch]);

      const roleOptions = useMemo(() => ({
        planner: choiceOptions(roleCandidates.planner, settings.planner),
        worker: choiceOptions(roleCandidates.worker, settings.worker),
      }), [roleCandidates, settings.planner, settings.worker]);

      const catalogPreview = useMemo(
        () => visibleCandidates(candidates, "", null, CATALOG_PREVIEW_LIMIT),
        [candidates],
      );

      const summary = currentSnapshot
        ? `${badge} · ${settings.scope === "local-only" ? "Local only" : "Local first"}`
        : phase === "error" ? "Router status unavailable" : "Loading router status…";

      if (!visibleHere) return null;
      return h(
        "div",
        { style: placement === "header" ? { ...styles.host, position: "relative", top: "auto", right: "auto", width: "auto" } : styles.host, "data-halo-router-dev": "true" },
        h(
          "button",
          {
            type: "button",
            style: styles.button,
            ref: triggerRef,
            "aria-expanded": open,
            "aria-controls": "halo-router-panel",
            "aria-label": `Halo Router controls, ${badge}`,
            onClick: () => setOpen((value) => !value),
          },
          `Router · ${badge}`,
        ),
        open && h(
          "section",
          { id: "halo-router-panel", role: "dialog", "aria-label": "Halo Router controls", "aria-modal": "false", "aria-busy": phase === "loading", style: styles.panel },
          h(
            "header",
            { style: { display: "flex", justifyContent: "space-between", alignItems: "start", gap: 10 } },
            h("div", null,
              h("h2", { style: styles.title }, "Halo Router"),
              h("div", { style: { ...styles.muted, marginTop: 4 } }, summary),
            ),
            h("div", { style: { display: "flex", gap: 6 } },
              h("button", { type: "button", style: styles.action, onClick: () => void load(), disabled: phase === "loading" || saving }, "Refresh"),
              h("button", {
                type: "button",
                style: styles.action,
                onClick: () => {
                  setOpen(false);
                  triggerRef.current?.focus?.();
                },
                "aria-label": "Close Halo Router controls",
              }, "Close"),
            ),
          ),
          phase === "loading" && h("p", { style: { ...styles.muted, margin: "14px 0 0" }, role: "status" }, "Loading router status…"),
          error && h("div", { style: styles.error, role: "alert" }, error.message),
          phase === "ready" && currentSnapshot && h(
            React.Fragment,
            null,
            h("div", { style: styles.card },
              h("strong", null, "Model selected for request"),
              !latestDecision
                ? h("div", { style: { ...styles.muted, marginTop: 5 } }, "No model selection recorded yet.")
                : h(React.Fragment, null,
                  h("div", { style: { marginTop: 6, fontWeight: 600, overflowWrap: "anywhere" } },
                    `${humanRoleLabel(latestDecision.role)} · ${formatDecisionEndpoint(latestDecision.from)} → ${formatDecisionEndpoint(latestDecision.to)}`),
                  h("div", { style: { ...styles.muted, marginTop: 2, fontSize: 11 } },
                    `${formatTimestamp(latestDecision.timestamp)}${latestDecision.status ? ` · ${latestDecision.status}` : ""}`),
                  latestDecision.reason && h("div", { style: { ...styles.muted, marginTop: 5, fontSize: 11 } }, shortReason(latestDecision.reason)),
                  latestDecision.reason && h("details", { style: { marginTop: 6 } },
                    h("summary", { style: { cursor: "pointer", fontSize: 11 } }, "Selection details"),
                    h("div", { style: { ...styles.muted, marginTop: 5, fontSize: 11, overflowWrap: "anywhere" } }, latestDecision.reason),
                  )),
            ),
            h("div", { style: styles.row },
              h("label", { style: styles.label, htmlFor: "halo-router-mode" }, "Routing mode"),
              h("select", {
                id: "halo-router-mode",
                style: styles.select,
                value: settings.mode || "manual",
                disabled: saving,
                onChange: (event) => void configure({ mode: event.target.value }),
              },
              h("option", { value: "automatic" }, "Automatic (router decides)"),
              h("option", { value: "manual" }, "Manual (native DSH picker)")),
            ),
            h("div", { style: styles.row },
              h("label", { style: styles.label, htmlFor: "halo-router-scope" }, "Provider preference"),
              h("select", {
                id: "halo-router-scope",
                style: styles.select,
                value: settings.scope || "local-first",
                disabled: saving,
                onChange: (event) => void configure({ scope: event.target.value }),
              },
              h("option", { value: "local-first" }, "Local first (fallback allowed)"),
              h("option", { value: "local-only" }, "Local only (no remote fallback)")),
            ),
            h("div", { style: { ...styles.muted, marginTop: 9, fontSize: 11 } },
              settings.mode === "automatic"
                ? "Automatic mode evaluates qualified routes. A role override below replaces automatic selection for that role."
                : "Manual mode keeps the model chosen in DSH’s native picker. Role overrides below are saved for Automatic mode only."),
            h("div", { style: styles.row },
              h("label", { style: styles.label, htmlFor: "halo-router-planner-search" }, "Find planner override (Auto only)"),
              h("input", {
                id: "halo-router-planner-search",
                type: "search",
                style: styles.input,
                value: plannerSearch,
                placeholder: "Search provider, model, or candidate id",
                onChange: (event) => setPlannerSearch(event.target.value),
              }),
              h("label", { style: styles.label, htmlFor: "halo-router-planner" }, `Planner override · showing ${roleCandidates.planner.length} of ${candidates.length}`),
              h("select", {
                id: "halo-router-planner",
                style: styles.select,
                value: settings.planner || "",
                disabled: saving,
                onChange: (event) => void configure({ planner: event.target.value || null }),
              }, roleOptions.planner),
            ),
            h("div", { style: styles.row },
              h("label", { style: styles.label, htmlFor: "halo-router-worker-search" }, "Find coding worker override (Auto only)"),
              h("input", {
                id: "halo-router-worker-search",
                type: "search",
                style: styles.input,
                value: workerSearch,
                placeholder: "Search provider, model, or candidate id",
                onChange: (event) => setWorkerSearch(event.target.value),
              }),
              h("label", { style: styles.label, htmlFor: "halo-router-worker" }, `Coding worker override · showing ${roleCandidates.worker.length} of ${candidates.length}`),
              h("select", {
                id: "halo-router-worker",
                style: styles.select,
                value: settings.worker || "",
                disabled: saving,
                onChange: (event) => void configure({ worker: event.target.value || null }),
              }, roleOptions.worker),
            ),
            h("div", { style: styles.card },
              h("strong", null, "Current routing controls"),
              h("div", { style: { ...styles.muted, marginTop: 4 } },
                sessionSpecific ? "Session-specific settings are active." : "Using production defaults for this session."),
              defaults && h("div", { style: { ...styles.muted, marginTop: 3, fontSize: 11 } }, `Defaults: ${defaults.mode || "—"} · ${defaults.scope || "—"}`),
            ),
            olderDecisions.length > 0 && h("details", { style: styles.card },
              h("summary", { style: { cursor: "pointer", fontWeight: 650 } }, `Earlier model selections (${olderDecisions.length})`),
              h("ol", { style: { margin: "7px 0 0", paddingLeft: 20 } }, olderDecisions.map((decision, index) => h(
                "li",
                { key: decision.decisionId || `${decision.timestamp || "decision"}-${index}`, style: { marginTop: 7 } },
                h("div", { style: { fontWeight: 600, overflowWrap: "anywhere" } },
                  `${humanRoleLabel(decision.role)} · ${formatDecisionEndpoint(decision.from)} → ${formatDecisionEndpoint(decision.to)}`),
                h("div", { style: { ...styles.muted, marginTop: 2, fontSize: 11 } },
                  `${formatTimestamp(decision.timestamp)}${decision.status ? ` · ${decision.status}` : ""}`),
                decision.reason ? h("div", { style: { ...styles.muted, marginTop: 2, fontSize: 11 } }, decision.reason) : null,
              ))),
            ),
            h("div", { style: styles.card },
              h("strong", null, `Discovered catalog (${candidates.length})`),
              candidates.length === 0
                ? h("div", { style: { ...styles.muted, marginTop: 5 } }, "No candidates are currently available.")
                : h(React.Fragment, null,
                  h("div", { style: { ...styles.muted, marginTop: 5 } },
                    `Search the role pickers above to inspect all ${candidates.length} routes. Showing ${catalogPreview.length} useful candidates.`),
                  h("ul", { style: { margin: "7px 0 0", paddingLeft: 18 } }, catalogPreview.map((candidate) => h(
                    "li",
                    { key: candidate.candidateId, style: { marginTop: 4, overflowWrap: "anywhere" } },
                    `${candidateLabel(candidate)} · ${localityLabel(candidate)}`,
                  )))),
            ),
            snapshot.version && h("div", { style: { ...styles.muted, marginTop: 12, fontSize: 11 } }, `Contract ${snapshot.version}`),
          ),
        ),
      );
    }

    function apply(ctx) {
      // The generated remote contribution may be mounted by the parent DEV
      // assembly. Otherwise this entry mounts its own equivalent exactly once.
      ctx.effect(async () => {
        const remote = ctx.get("remote");
        if (typeof remote?.$mount !== "function") return undefined;
        const dispose = await remote.$mount(TYPERT_REMOTE);
        return () => dispose();
      }, "halo-router-ui: mount haloRouting Remote");
      ctx.inject(["slots", "remote.haloRouting", "sessions"], (scope) => {
        for (const [name, placement] of [["shell.overlay", "overlay"], ["conversation.session.header.utilities", "header"]]) scope.slots.inject(name, () => scope.slots.register({
          name,
          id: `halo-router-control-${placement}`,
          order: 100,
          label: "Halo Router",
          inject: () => ({
            placement,
            remote: {haloRouting: scope.get("remote.haloRouting")},
            sessions: scope.get("sessions"),
          }),
        }, RouterOverlay));
      });
    }

    exports.apply = apply;
    exports.inject = inject;
    exports.RouterOverlay = RouterOverlay;
    exports.__test = { formatDecisionEndpoint, visibleCandidates, routerBadge, humanRoleLabel, shortReason };
    return module.exports;
  },
});
