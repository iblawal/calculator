(() => {
  "use strict";

  const MAX_DIGITS = 12;
  const SYMBOLS = { "+": "+", "-": "\u2212", "*": "\u00d7", "/": "\u00f7" };

  const currentEl = document.getElementById("current");
  const historyEl = document.getElementById("history");

  const state = {
    current: "0",          // string shown on the display
    previous: null,        // number stored before an operator
    operator: null,        // "+", "-", "*", "/"
    waitingForOperand: false,
    justEvaluated: false,
    error: false,
  };

  // ---- Math -------------------------------------------------------------

  function calculate(a, b, op) {
    switch (op) {
      case "+": return a + b;
      case "-": return a - b;
      case "*": return a * b;
      case "/": return b === 0 ? null : a / b;
      default:  return b;
    }
  }

  // Trim floating-point noise (0.1 + 0.2 -> 0.3) and keep the result readable.
  function format(n) {
    const rounded = parseFloat(n.toPrecision(MAX_DIGITS));
    const str = String(rounded);
    return str.length > 14 ? rounded.toExponential(6) : str;
  }

  // ---- State helpers ----------------------------------------------------

  function reset() {
    state.current = "0";
    state.previous = null;
    state.operator = null;
    state.waitingForOperand = false;
    state.justEvaluated = false;
    state.error = false;
  }

  function showError(message) {
    reset();
    state.error = true;
    state.current = message;
  }

  // ---- Actions ----------------------------------------------------------

  function inputDigit(d) {
    if (state.error || state.justEvaluated) reset();

    if (state.waitingForOperand) {
      state.current = d;
      state.waitingForOperand = false;
      return;
    }

    const digits = state.current.replace(/[-.]/g, "").length;
    if (digits >= MAX_DIGITS) return;

    state.current = state.current === "0" ? d : state.current + d;
  }

  function inputDecimal() {
    if (state.error || state.justEvaluated) reset();

    if (state.waitingForOperand) {
      state.current = "0.";
      state.waitingForOperand = false;
      return;
    }
    if (!state.current.includes(".")) state.current += ".";
  }

  function inputOperator(op) {
    if (state.error) return;

    const value = parseFloat(state.current);

    // Changing your mind: swap the operator without computing.
    if (state.operator && state.waitingForOperand) {
      state.operator = op;
      return;
    }

    if (state.operator && state.previous !== null) {
      const result = calculate(state.previous, value, state.operator);
      if (result === null) return showError("Can't divide by 0");
      state.previous = result;
      state.current = format(result);
    } else {
      state.previous = value;
    }

    state.operator = op;
    state.waitingForOperand = true;
    state.justEvaluated = false;
  }

  function evaluate() {
    if (state.error || !state.operator || state.previous === null) return;
    if (state.waitingForOperand) return;

    const left = state.previous;
    const right = parseFloat(state.current);
    const result = calculate(left, right, state.operator);

    if (result === null) return showError("Can't divide by 0");

    historyEl.textContent =
      `${format(left)} ${SYMBOLS[state.operator]} ${format(right)} =`;
    state.current = format(result);
    state.previous = null;
    state.operator = null;
    state.waitingForOperand = false;
    state.justEvaluated = true;
  }

  function percent() {
    if (state.error) return;
    state.current = format(parseFloat(state.current) / 100);
  }

  function backspace() {
    if (state.error || state.justEvaluated || state.waitingForOperand) return;
    const next = state.current.slice(0, -1);
    state.current = next === "" || next === "-" ? "0" : next;
  }

  // ---- Rendering --------------------------------------------------------

  function render() {
    currentEl.textContent = state.current;
    currentEl.classList.toggle("small", state.current.length > 10);

    if (state.operator && state.previous !== null) {
      historyEl.textContent = `${format(state.previous)} ${SYMBOLS[state.operator]}`;
    } else if (!state.justEvaluated) {
      historyEl.textContent = "";
    }
  }

  function dispatch(action, value) {
    switch (action) {
      case "digit":    inputDigit(value); break;
      case "decimal":  inputDecimal(); break;
      case "operator": inputOperator(value); break;
      case "equals":   evaluate(); break;
      case "percent":  percent(); break;
      case "delete":   backspace(); break;
      case "clear":    reset(); historyEl.textContent = ""; break;
    }
    render();
  }

  // ---- Events -----------------------------------------------------------

  document.querySelector(".keys").addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    dispatch(btn.dataset.action, btn.dataset.value);
  });

  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    const k = e.key;
    if (/^[0-9]$/.test(k)) dispatch("digit", k);
    else if (k === "." || k === ",") dispatch("decimal");
    else if (["+", "-", "*", "/"].includes(k)) dispatch("operator", k);
    else if (k === "Enter" || k === "=") dispatch("equals");
    else if (k === "%") dispatch("percent");
    else if (k === "Backspace") dispatch("delete");
    else if (k === "Escape" || k === "Delete") dispatch("clear");
    else return;

    e.preventDefault(); // stops Enter from re-clicking a focused button
  });

  render();
})();