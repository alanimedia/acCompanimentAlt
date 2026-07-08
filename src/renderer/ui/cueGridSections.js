import { uiLog } from './uiLogger.js';
import {
    endDragGap,
    getDragGapState,
    updateDragGapAt,
    applyItemsAtDropIntent
} from './dragGapPlaceholder.js';
import { startDragAutoScroll, stopDragAutoScroll } from './dragAutoScroll.js';

export function buildLayoutFromDom(container) {
    const layout = [];
    if (!container) return layout;

    container.querySelectorAll(':scope > .cue-section-block').forEach(block => {
        const sectionId = block.dataset.sectionId;
        if (!sectionId) return;
        layout.push({ type: 'section', sectionId });
        block.querySelectorAll(':scope > .cue-section-body > .cue-wrapper').forEach(wrapper => {
            const cueId = wrapper.dataset.cueId
                || wrapper.querySelector('.cue-button')?.dataset.cueId
                || wrapper.querySelector('.cue-edit-card')?.dataset.cueId;
            if (cueId) {
                layout.push({ type: 'cue', cueId, sectionId });
            }
        });
    });

    return layout;
}

export function createSectionBlock(section, {
    isEditMode = false,
    gridContainer = null,
    onToggleCollapse,
    onRename,
    onDelete
} = {}) {
    const block = document.createElement('div');
    block.className = 'cue-section-block';
    block.dataset.sectionId = section.id;
    if (section.collapsed) block.classList.add('collapsed');

    const header = document.createElement('div');
    header.className = 'cue-section-header';

    if (isEditMode) {
        const dragHandle = document.createElement('span');
        dragHandle.className = 'cue-section-drag-handle';
        dragHandle.title = 'Drag to reorder section';
        dragHandle.textContent = '⋮⋮';
        dragHandle.draggable = true;
        dragHandle.setAttribute('aria-label', 'Drag to reorder section');
        dragHandle.addEventListener('mousedown', (e) => e.stopPropagation());
        dragHandle.addEventListener('click', (e) => e.stopPropagation());
        dragHandle.addEventListener('dragstart', (e) => {
            e.stopPropagation();
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('application/x-accompaniment-section-id', section.id);
            block.classList.add('dragging-section');
            const container = gridContainer || block.closest('#cueGridContainer');
            container?.classList.add('section-drag-active');
            startDragAutoScroll(document.getElementById('mainDropArea'));
        });
        dragHandle.addEventListener('dragend', () => {
            block.classList.remove('dragging-section');
            const container = gridContainer || block.closest('#cueGridContainer');
            container?.classList.remove('section-drag-active');
            container?.querySelectorAll('.cue-section-block.section-insert-before, .cue-section-block.section-insert-after')
                .forEach(el => el.classList.remove('section-insert-before', 'section-insert-after'));
            stopDragAutoScroll();
        });
        header.appendChild(dragHandle);
    }

    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = 'cue-section-toggle';
    toggleBtn.title = section.collapsed ? 'Expand section' : 'Collapse section';
    toggleBtn.setAttribute('aria-label', section.collapsed ? 'Expand section' : 'Collapse section');
    toggleBtn.textContent = section.collapsed ? '▸' : '▾';

    const titleEl = document.createElement(isEditMode ? 'input' : 'span');
    titleEl.className = 'cue-section-title';
    if (isEditMode) {
        titleEl.type = 'text';
        titleEl.value = section.title || 'Section';
        titleEl.addEventListener('change', () => {
            if (typeof onRename === 'function') onRename(section.id, titleEl.value);
        });
    } else {
        titleEl.textContent = section.title || 'Section';
    }

    header.appendChild(toggleBtn);
    header.appendChild(titleEl);

    if (isEditMode && typeof onDelete === 'function') {
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'cue-section-delete';
        deleteBtn.title = 'Delete section';
        deleteBtn.textContent = '×';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            onDelete(section.id);
        });
        header.appendChild(deleteBtn);
    }

    const body = document.createElement('div');
    body.className = 'cue-section-body';
    body.dataset.sectionId = section.id;

    const dropHint = document.createElement('div');
    dropHint.className = 'cue-section-drop-hint';
    dropHint.textContent = isEditMode ? 'Drop files or cues here' : '';
    body.appendChild(dropHint);

    const toggleCollapse = () => {
        const nextCollapsed = !block.classList.contains('collapsed');
        block.classList.toggle('collapsed', nextCollapsed);
        toggleBtn.textContent = nextCollapsed ? '▸' : '▾';
        toggleBtn.title = nextCollapsed ? 'Expand section' : 'Collapse section';
        toggleBtn.setAttribute('aria-label', nextCollapsed ? 'Expand section' : 'Collapse section');
        if (typeof onToggleCollapse === 'function') {
            onToggleCollapse(section.id, nextCollapsed);
        }
    };

    toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleCollapse();
    });

    header.addEventListener('click', (e) => {
        if (e.target.closest('input.cue-section-title, .cue-section-delete, .cue-section-toggle, .cue-section-drag-handle')) {
            return;
        }
        toggleCollapse();
    });

    if (isEditMode) {
        titleEl.addEventListener('mousedown', (e) => e.stopPropagation());
        titleEl.addEventListener('click', (e) => e.stopPropagation());
    }

    block.appendChild(header);
    block.appendChild(body);
    return block;
}

export function createAddSectionButton(onAdd) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cue-section-add-btn';
    btn.textContent = '+ Add Section';
    btn.addEventListener('click', () => {
        if (typeof onAdd === 'function') onAdd();
    });
    return btn;
}

export function getSectionIdFromDropTarget(element) {
    if (!element) return null;
    const body = element.closest('.cue-section-body, .cue-section-header, .cue-section-block');
    if (!body) return null;
    return body.dataset.sectionId || body.closest('.cue-section-block')?.dataset.sectionId || null;
}

function findInsertPositionInSection(sectionBody, clientX, clientY) {
    const wrappers = [...sectionBody.querySelectorAll(':scope > .cue-wrapper:not(.dragging-cue-group)')];
    if (wrappers.length === 0) {
        return { append: true };
    }

    for (const wrapper of wrappers) {
        const rect = wrapper.getBoundingClientRect();
        if (clientX >= rect.left && clientX <= rect.right
            && clientY >= rect.top && clientY <= rect.bottom) {
            const midpoint = rect.left + rect.width / 2;
            return clientX < midpoint ? { before: wrapper } : { after: wrapper };
        }
    }

    let closest = null;
    let closestDist = Infinity;
    for (const wrapper of wrappers) {
        const rect = wrapper.getBoundingClientRect();
        const centerY = rect.top + rect.height / 2;
        const dist = Math.abs(clientY - centerY);
        if (dist < closestDist) {
            closestDist = dist;
            closest = wrapper;
        }
    }

    if (closest) {
        const rect = closest.getBoundingClientRect();
        if (clientY < rect.top) return { before: closest };
        if (clientY > rect.bottom) return { after: closest };
        const midpoint = rect.left + rect.width / 2;
        return clientX < midpoint ? { before: closest } : { after: closest };
    }

    return { append: true };
}

export function sortWrappersDocumentOrder(wrappers) {
    return [...wrappers].sort((a, b) => {
        if (a === b) return 0;
        const position = a.compareDocumentPosition(b);
        if (position & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
        if (position & Node.DOCUMENT_POSITION_PRECEDING) return 1;
        return 0;
    });
}

export function getActiveDragWrappers(container = document, dataTransfer = null) {
    const root = container || document;
    const group = [...root.querySelectorAll('.cue-wrapper.dragging-cue-group')];
    if (group.length > 0) {
        return sortWrappersDocumentOrder(group);
    }
    const primary = root.querySelector('.cue-wrapper.dragging-cue');
    if (primary) return [primary];

    if (dataTransfer) {
        const idsValue = dataTransfer.getData('application/x-accompaniment-cue-ids');
        const cueIds = idsValue
            ? idsValue.split(',').filter(Boolean)
            : [dataTransfer.getData('text/plain')].filter(Boolean);
        const wrappers = cueIds.map(cueId => {
            const el = root.querySelector(`.cue-wrapper[data-cue-id="${cueId}"]`)
                || root.querySelector(`.cue-edit-card[data-cue-id="${cueId}"]`);
            return el?.classList?.contains('cue-wrapper') ? el : el?.closest('.cue-wrapper') || null;
        }).filter(Boolean);
        if (wrappers.length > 0) {
            return sortWrappersDocumentOrder(wrappers);
        }
    }

    return [];
}

function resolveSectionBodyFromEventTarget(target, container) {
    if (!target) return null;
    const body = target.closest('.cue-section-body');
    if (body) return body;
    const block = target.closest('.cue-section-block');
    return block?.querySelector('.cue-section-body') || null;
}

function removeWrappersFromDom(wrappers) {
    wrappers.forEach(wrapper => wrapper.remove());
}

export function insertWrappersBefore(parent, wrappers, referenceNode) {
    if (!parent || !referenceNode || !wrappers?.length) return;
    const ordered = sortWrappersDocumentOrder(wrappers);
    removeWrappersFromDom(ordered);
    let ref = referenceNode;
    ordered.forEach(wrapper => {
        parent.insertBefore(wrapper, ref);
        ref = wrapper.nextSibling;
    });
}

export function insertWrappersAfter(parent, wrappers, referenceNode) {
    if (!parent || !referenceNode || !wrappers?.length) return;
    const ordered = sortWrappersDocumentOrder(wrappers);
    removeWrappersFromDom(ordered);
    let ref = referenceNode.nextSibling;
    ordered.forEach(wrapper => {
        parent.insertBefore(wrapper, ref);
        ref = wrapper.nextSibling;
    });
}

export function appendWrappersToSection(sectionBody, wrappers) {
    if (!sectionBody || !wrappers?.length) return;
    const ordered = sortWrappersDocumentOrder(wrappers);
    removeWrappersFromDom(ordered);
    ordered.forEach(wrapper => sectionBody.appendChild(wrapper));
}

function updateSectionDragGap(sectionBody, clientX, clientY, slotCount) {
    if (!sectionBody) return;
    const state = getDragGapState();
    if (!state) return;

    const position = findInsertPositionInSection(sectionBody, clientX, clientY);
    if (position.before) {
        updateDragGapAt(state, {
            parent: sectionBody,
            refNode: position.before,
            insertBefore: true,
            slotCount
        });
        return;
    }
    if (position.after) {
        updateDragGapAt(state, {
            parent: sectionBody,
            refNode: position.after,
            insertBefore: false,
            slotCount
        });
        return;
    }
    updateDragGapAt(state, {
        parent: sectionBody,
        refNode: null,
        slotCount
    });
}

export function moveCueWrappersInSection(sectionBody, wrappers, clientX, clientY) {
    if (!sectionBody || !wrappers?.length) return;

    const ordered = sortWrappersDocumentOrder(wrappers);
    removeWrappersFromDom(ordered);
    const position = findInsertPositionInSection(sectionBody, clientX, clientY);

    if (position.before) {
        insertWrappersBefore(sectionBody, ordered, position.before);
        return;
    }

    if (position.after) {
        insertWrappersAfter(sectionBody, ordered, position.after);
        return;
    }

    appendWrappersToSection(sectionBody, ordered);
}

export function moveCueWrapperInSection(sectionBody, draggedWrapper, clientX, clientY) {
    moveCueWrappersInSection(sectionBody, [draggedWrapper], clientX, clientY);
}

const SECTION_DRAG_MIME = 'application/x-accompaniment-section-id';

function isSectionDragEvent(event) {
    return event.dataTransfer?.types?.includes(SECTION_DRAG_MIME);
}

function clearSectionInsertIndicators(container) {
    container?.querySelectorAll('.cue-section-block.section-insert-before, .cue-section-block.section-insert-after')
        .forEach(el => el.classList.remove('section-insert-before', 'section-insert-after'));
}

function updateSectionInsertIndicator(container, clientY) {
    clearSectionInsertIndicators(container);
    const blocks = [...container.querySelectorAll(':scope > .cue-section-block:not(.dragging-section)')];
    for (const block of blocks) {
        const rect = block.getBoundingClientRect();
        if (clientY < rect.top + rect.height / 2) {
            block.classList.add('section-insert-before');
            return;
        }
    }
    if (blocks.length > 0) {
        blocks[blocks.length - 1].classList.add('section-insert-after');
    }
}

function moveSectionBlockByPosition(container, draggedBlock, clientY) {
    if (!container || !draggedBlock) return;
    const addBtn = container.querySelector(':scope > .cue-section-add-btn');
    const blocks = [...container.querySelectorAll(':scope > .cue-section-block:not(.dragging-section)')];
    draggedBlock.remove();
    for (const block of blocks) {
        const rect = block.getBoundingClientRect();
        if (clientY < rect.top + rect.height / 2) {
            container.insertBefore(draggedBlock, block);
            return;
        }
    }
    if (addBtn) {
        container.insertBefore(draggedBlock, addBtn);
    } else {
        container.appendChild(draggedBlock);
    }
}

export function bindSectionBlockDragDrop(container, {
    canAcceptDrag = () => true,
    onSectionReordered
} = {}) {
    if (!container || container.dataset.sectionBlockDragBound === 'true') return;
    container.dataset.sectionBlockDragBound = 'true';

    container.addEventListener('dragover', (event) => {
        if (typeof canAcceptDrag === 'function' && !canAcceptDrag()) return;
        if (!isSectionDragEvent(event)) return;

        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = 'move';
        updateSectionInsertIndicator(container, event.clientY);
    });

    container.addEventListener('dragleave', (event) => {
        if (!isSectionDragEvent(event)) return;
        if (container.contains(event.relatedTarget)) return;
        clearSectionInsertIndicators(container);
    });

    container.addEventListener('drop', async (event) => {
        if (typeof canAcceptDrag === 'function' && !canAcceptDrag()) return;
        if (!isSectionDragEvent(event)) return;

        const sectionId = event.dataTransfer.getData(SECTION_DRAG_MIME);
        const draggedBlock = container.querySelector(`.cue-section-block[data-section-id="${sectionId}"]`);
        if (!draggedBlock) return;

        event.preventDefault();
        event.stopPropagation();
        clearSectionInsertIndicators(container);
        moveSectionBlockByPosition(container, draggedBlock, event.clientY);
        container.classList.remove('section-drag-active');
        draggedBlock.classList.remove('dragging-section');

        if (typeof onSectionReordered === 'function') {
            await onSectionReordered();
        }
    });
}

export function bindSectionCueDragDrop(container, {
    canAcceptDrop,
    onCueDropped
} = {}) {
    if (!container || container.dataset.sectionCueDropBound === 'true') return;
    container.dataset.sectionCueDropBound = 'true';

    const clearSectionDragOver = () => {
        container.querySelectorAll('.cue-section-body.cue-section-drag-over').forEach(el => {
            el.classList.remove('cue-section-drag-over');
        });
    };

    container.addEventListener('dragover', (event) => {
        if (typeof canAcceptDrop === 'function' && !canAcceptDrop()) return;
        if (isSectionDragEvent(event)) return;
        const draggedWrappers = getActiveDragWrappers(container);
        if (draggedWrappers.length === 0) return;

        const sectionBody = resolveSectionBodyFromEventTarget(event.target, container);
        if (!sectionBody) return;

        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = 'move';
        clearSectionDragOver();
        sectionBody.classList.add('cue-section-drag-over');
        updateSectionDragGap(sectionBody, event.clientX, event.clientY, draggedWrappers.length);
    });

    container.addEventListener('dragleave', (event) => {
        const sectionBody = event.target.closest?.('.cue-section-body');
        if (!sectionBody) return;
        if (sectionBody.contains(event.relatedTarget)) return;
        sectionBody.classList.remove('cue-section-drag-over');
    });

    container.addEventListener('drop', async (event) => {
        if (typeof canAcceptDrop === 'function' && !canAcceptDrop()) return;
        if (isSectionDragEvent(event)) return;

        const draggedWrappers = getActiveDragWrappers(container, event.dataTransfer);
        if (draggedWrappers.length === 0) return;

        const sectionBody = resolveSectionBodyFromEventTarget(event.target, container);
        if (!sectionBody) return;

        if (event.target.closest('.cue-wrapper:not(.dragging-cue-group)')) return;

        event.preventDefault();
        event.stopPropagation();
        clearSectionDragOver();

        const applied = applyItemsAtDropIntent(draggedWrappers, {
            insertBefore: insertWrappersBefore,
            insertAfter: insertWrappersAfter,
            append: appendWrappersToSection
        });
        endDragGap();

        if (!applied) {
            moveCueWrappersInSection(sectionBody, draggedWrappers, event.clientX, event.clientY);
        }

        if (typeof onCueDropped === 'function') {
            await onCueDropped();
        }
    });

    return clearSectionDragOver;
}

export async function persistLayoutFromDom(cueGridContainer, cueStore) {
    if (!cueStore || typeof cueStore.saveWorkspaceLayout !== 'function') {
        uiLog.warn('persistLayoutFromDom: saveWorkspaceLayout unavailable');
        return;
    }
    const sections = typeof cueStore.getSections === 'function' ? cueStore.getSections() : [];
    const layout = buildLayoutFromDom(cueGridContainer);
    await cueStore.saveWorkspaceLayout(sections, layout);
}
