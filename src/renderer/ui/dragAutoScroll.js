/** Auto-scroll a container while dragging (edge proximity + mouse wheel). */

const EDGE_PX = 64;
const MAX_SCROLL_SPEED = 20;

let activeScrollContainer = null;
let autoScrollRaf = null;
let lastPointerY = null;
let dragOverHandler = null;
let wheelHandler = null;

function tickAutoScroll() {
    if (!activeScrollContainer || lastPointerY == null) {
        autoScrollRaf = null;
        return;
    }

    const rect = activeScrollContainer.getBoundingClientRect();
    let delta = 0;

    if (lastPointerY < rect.top + EDGE_PX) {
        const intensity = (rect.top + EDGE_PX - lastPointerY) / EDGE_PX;
        delta = -MAX_SCROLL_SPEED * Math.min(1, Math.max(0, intensity));
    } else if (lastPointerY > rect.bottom - EDGE_PX) {
        const intensity = (lastPointerY - (rect.bottom - EDGE_PX)) / EDGE_PX;
        delta = MAX_SCROLL_SPEED * Math.min(1, Math.max(0, intensity));
    }

    if (delta !== 0) {
        activeScrollContainer.scrollTop += delta;
    }

    autoScrollRaf = requestAnimationFrame(tickAutoScroll);
}

function updatePointerY(clientY) {
    if (!activeScrollContainer || clientY == null) return;
    lastPointerY = clientY;
    if (!autoScrollRaf) {
        autoScrollRaf = requestAnimationFrame(tickAutoScroll);
    }
}

export function startDragAutoScroll(scrollContainer) {
    stopDragAutoScroll();
    if (!scrollContainer) return;

    activeScrollContainer = scrollContainer;
    lastPointerY = null;

    dragOverHandler = (event) => {
        if (event.clientY != null) {
            updatePointerY(event.clientY);
        }
    };

    wheelHandler = (event) => {
        if (!activeScrollContainer) return;
        activeScrollContainer.scrollTop += event.deltaY;
        event.preventDefault();
    };

    document.addEventListener('dragover', dragOverHandler);
    document.addEventListener('touchmove', dragOverHandler, { passive: true });
    document.addEventListener('wheel', wheelHandler, { passive: false });
}

export function stopDragAutoScroll() {
    activeScrollContainer = null;
    lastPointerY = null;

    if (autoScrollRaf != null) {
        cancelAnimationFrame(autoScrollRaf);
        autoScrollRaf = null;
    }

    if (dragOverHandler) {
        document.removeEventListener('dragover', dragOverHandler);
        document.removeEventListener('touchmove', dragOverHandler);
        dragOverHandler = null;
    }

    if (wheelHandler) {
        document.removeEventListener('wheel', wheelHandler);
        wheelHandler = null;
    }
}

export function updateDragAutoScrollPointer(clientY) {
    updatePointerY(clientY);
}
