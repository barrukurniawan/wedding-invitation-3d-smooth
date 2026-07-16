import { useThrelteUserContext } from '@threlte/core';
import { fromStore, toStore, writable } from 'svelte/store';
export const useCursor = (cursor = 'pointer', 
/**
 * @deprecated Set the default cursor in CSS instead. This parameter will be removed in a future version.
 */
onPointerOut, target) => {
    let hovering = $state(false);
    const instance = { cursor: '', fallback: undefined };
    const onPointerEnter = () => {
        hovering = true;
        ctx.add(instance);
    };
    const onPointerLeave = () => {
        hovering = false;
        ctx.remove(instance);
    };
    // Account for SSR
    if (typeof window === 'undefined') {
        return {
            hovering: toStore(() => hovering),
            onPointerEnter,
            onPointerLeave
        };
    }
    const el = target ?? document.body;
    if (onPointerOut !== undefined) {
        console.warn('useCursor: onPointerOut is deprecated. Set the default cursor in CSS instead. ' +
            'This parameter will be removed in a future version.');
    }
    const ctx = useThrelteUserContext('threlte-extras-use-cursor', () => {
        const originalCursor = el.style.cursor;
        const active = [];
        return {
            active,
            originalCursor,
            el,
            add(instance) {
                active.push(instance);
                el.style.cursor = instance.cursor;
            },
            remove(instance) {
                const index = active.indexOf(instance);
                if (index === -1)
                    return;
                active.splice(index, 1);
                if (active.length > 0) {
                    el.style.cursor = active[active.length - 1]?.cursor;
                }
                else {
                    el.style.cursor = instance.fallback ?? originalCursor;
                }
            },
            refresh() {
                if (active.length > 0) {
                    el.style.cursor = active[active.length - 1].cursor;
                }
            }
        };
    });
    // Reactively track cursor values. If cursor or onPointerOut is a
    // store, this effect re-runs when the store changes, keeping the instance
    // in sync and refreshing the cursor if this instance is currently active.
    const cursorStore = fromStore(typeof cursor === 'string' ? writable(cursor) : cursor);
    const fallbackStore = onPointerOut !== undefined
        ? fromStore(typeof onPointerOut === 'string' ? writable(onPointerOut) : onPointerOut)
        : undefined;
    $effect.pre(() => {
        instance.cursor = cursorStore.current;
        if (fallbackStore) {
            instance.fallback = fallbackStore.current;
        }
        if (hovering) {
            ctx.refresh();
        }
    });
    // Clean up on unmount
    $effect(() => {
        return () => {
            ctx.remove(instance);
        };
    });
    return {
        hovering: toStore(() => hovering),
        onPointerEnter,
        onPointerLeave
    };
};
