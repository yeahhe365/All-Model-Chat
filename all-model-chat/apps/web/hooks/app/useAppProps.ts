
import { useAppLogic } from './useAppLogic';
import { useSidebarProps } from './props/useSidebarProps';
import { useChatAreaProps } from './props/useChatAreaProps';
import { useAppModalsProps } from './props/useAppModalsProps';

export const useAppProps = (logic: ReturnType<typeof useAppLogic>) => {
  const sidebarProps = useSidebarProps(logic);
  const chatAreaProps = useChatAreaProps(logic);
  const appModalsProps = useAppModalsProps(logic);

  return { sidebarProps, chatAreaProps, appModalsProps };
};
