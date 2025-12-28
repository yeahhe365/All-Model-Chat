
import { ChatInputProps } from '../../types';
import { useChatInputLogic } from './useChatInputLogic';
import { useChatInputPropsBuilder } from './useChatInputPropsBuilder';

export const useChatInputController = (props: ChatInputProps) => {
    const logic = useChatInputLogic(props);
    const viewProps = useChatInputPropsBuilder(logic, props);
    
    return viewProps;
};
