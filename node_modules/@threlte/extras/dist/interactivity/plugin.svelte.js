import { injectPlugin, isInstanceOf } from '@threlte/core';
import { useInteractivity } from './context.js';
export const interactivityEventNames = [
    'onclick',
    'oncontextmenu',
    'ondblclick',
    'onwheel',
    'onpointerup',
    'onpointerdown',
    'onpointerover',
    'onpointerout',
    'onpointerenter',
    'onpointerleave',
    'onpointermove',
    'onpointermissed'
];
export const injectInteractivityPlugin = () => {
    injectPlugin('interactivity', (args) => {
        if (!isInstanceOf(args.ref, 'Object3D'))
            return;
        const { addInteractiveObject, removeInteractiveObject } = useInteractivity();
        $effect.pre(() => {
            const ref = args.ref;
            const props = args.props;
            const hasEventHandlers = interactivityEventNames.some((eventName) => typeof props[eventName] === 'function');
            if (!hasEventHandlers)
                return;
            addInteractiveObject(ref, props);
            return () => {
                removeInteractiveObject(ref);
            };
        });
        return {
            pluginProps: interactivityEventNames
        };
    });
};
