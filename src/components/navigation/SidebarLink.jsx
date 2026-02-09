import React from 'react';
import { Link } from 'react-router-dom';
import { useAssistanceMode } from '@/components/hooks/useAssistanceMode';
import { createPageUrl } from '@/utils';

export function SidebarLink({ pageName, children, className, ...props }) {
  const { queryString } = useAssistanceMode();
  const url = createPageUrl(pageName) + queryString;

  return (
    <Link to={url} className={className} {...props}>
      {children}
    </Link>
  );
}