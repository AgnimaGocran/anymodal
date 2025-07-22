import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useMemo, useState, useCallback, useRef, } from 'react';
import { proxy, ref } from 'valtio';
import { useSnapshot } from 'valtio/react';
function useMultiAsync(fetchers, modal) {
    const [state, setState] = useState({
        isLoading: true,
        error: null,
        data: null,
    });
    const promiseFns = useMemo(() => fetchers.map((fetcher) => () => fetcher(modal)), [modal, fetchers]);
    const updateFns = useMemo(() => promiseFns.map((_, index) => async () => {
        try {
            const newData = await promiseFns[index]();
            setState((prevState) => {
                if (!prevState.data)
                    return prevState;
                const updatedData = [...prevState.data];
                updatedData[index] = newData;
                return { ...prevState, data: updatedData };
            });
        }
        catch (error) {
            setState((prevState) => ({
                ...prevState,
                error: error,
            }));
        }
    }), [promiseFns]);
    const updateAllFn = useCallback(async () => {
        setState((s) => ({ ...s, isLoading: true, error: null }));
        try {
            const promises = promiseFns.map((fn) => fn());
            const data = (await Promise.all(promises));
            setState({ isLoading: false, error: null, data });
        }
        catch (error) {
            setState({ isLoading: false, error: error, data: null });
        }
    }, [promiseFns]);
    const initialFetchStarted = useRef(false);
    useEffect(() => {
        if (!initialFetchStarted.current) {
            initialFetchStarted.current = true;
            updateAllFn();
        }
    }, [updateAllFn]);
    return { ...state, updateFns, updateAllFn };
}
export default function anyModal(loaderNode = () => null, errorNode = () => null) {
    const componentsRegistry = new Map();
    const modalsState = proxy({
        modal: null,
        modalsStack: [],
    });
    function show(modal) {
        if (modalsState.modal) {
            modalsState.modalsStack.push(modalsState.modal);
        }
        modalsState.modal = ref(modal);
    }
    function prev() {
        modalsState.modal = modalsState.modalsStack.pop() || null;
    }
    function close() {
        modalsState.modalsStack = [];
        modalsState.modal = null;
    }
    function create(type, Body) {
        componentsRegistry.set(type, Body);
    }
    // Implementation
    function createWithFetch(kind, fetcherOrFetchers, Body) {
        const ModalContent = ({ modal }) => {
            const isArray = Array.isArray(fetcherOrFetchers);
            const fetchers = (isArray ? fetcherOrFetchers : [fetcherOrFetchers]);
            const { isLoading, data, error, updateFns, updateAllFn } = useMultiAsync(fetchers, modal);
            if (error) {
                return errorNode(error);
            }
            if (isLoading || !data) {
                return loaderNode(modal);
            }
            return (_jsx(Body, { modal: modal, data: isArray ? data : data[0], update: isArray ? updateFns : updateFns[0], updateAll: updateAllFn }));
        };
        componentsRegistry.set(kind, ModalContent);
    }
    const ModalContainer = () => {
        const { modal } = useSnapshot(modalsState);
        if (!modal) {
            return null;
        }
        const Component = componentsRegistry.get(modal.type);
        if (!Component) {
            console.warn(`[AnyModal] Modal with type "${modal.type}" not found. Make sure it's registered.`);
            return null;
        }
        return _jsx(Component, { modal: modal });
    };
    return {
        show,
        prev,
        close,
        create,
        createWithFetch,
        modalsState,
        ModalContainer,
    };
}
