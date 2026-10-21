import type { ObjectDirective } from "vue";

// Reveal once, then return the element to its own hover/interaction transitions.
const cleanups = new WeakMap<HTMLElement, () => void>();
export const reveal: ObjectDirective<HTMLElement, number | undefined> = {
  mounted(element, binding) {
    if (
      matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !("IntersectionObserver" in window)
    )
      return;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const delay = Math.min(Math.max(binding.value || 0, 0), 260);
    element.style.setProperty("--reveal-delay", `${delay}ms`);
    element.classList.add("reveal-ready", "reveal-pending");
    const finish = () => {
      element.classList.remove("reveal-ready", "reveal-pending", "is-revealed");
      element.style.removeProperty("--reveal-delay");
    };
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        element.classList.add("is-revealed");
        observer.disconnect();
        timeout = setTimeout(finish, delay + 700);
      },
      { threshold: 0.05 },
    );
    observer.observe(element);
    cleanups.set(element, () => {
      observer.disconnect();
      clearTimeout(timeout);
      finish();
    });
  },
  unmounted(element) {
    cleanups.get(element)?.();
    cleanups.delete(element);
  },
};
