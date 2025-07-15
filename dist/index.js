import { jsx as _jsx } from "react/jsx-runtime";
import { useSnapshot } from 'valtio/react';
import { useAsync } from '@siberiacancode/reactuse';
import { proxy } from 'valtio';
export default function anyModal(loaderNode = () => null, errorNode = () => null) {
    const modalsState = proxy({
        modal: null,
        modalsStack: [],
    });
    function show(modal) {
        if (modalsState.modal) {
            modalsState.modalsStack.push(modalsState.modal);
        }
        modalsState.modal = modal;
    }
    function prev() {
        modalsState.modal = modalsState.modalsStack.pop() || null;
    }
    function closeAll() {
        modalsState.modalsStack = [];
        modalsState.modal = null;
    }
    function Modal({ type, render }) {
        const { modal } = useSnapshot(modalsState);
        if (!modal || modal.type !== type) {
            return null;
        }
        return render(modal);
    }
    function create(type, Body) {
        return function Wrapper() {
            return _jsx(Modal, { type: type, render: (modal) => _jsx(Body, { modal: modal }) });
        };
    }
    function createWithFetch(kind, fetchersFn, Body) {
        function ModalContent({ modal }) {
            const { isLoading, data, error } = useAsync(async () => {
                const promises = fetchersFn(modal);
                return await Promise.all(promises);
            }, [modal]);
            if (error) {
                return errorNode(error);
            }
            if (isLoading || !data) {
                return loaderNode(modal);
            }
            return _jsx(Body, { modal: modal, data: data });
        }
        return function Wrapper() {
            return _jsx(Modal, { type: kind, render: (modal) => _jsx(ModalContent, { modal: modal }) });
        };
    }
    return {
        show,
        prev,
        closeAll,
        create,
        createWithFetch,
        modalsState,
    };
}
