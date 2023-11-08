import React from 'react';
import clsx from 'clsx';
import NavbarNavLink from '@theme/NavbarItem/NavbarNavLink';
import { logEvent } from "../../../analytics/analytics.js";
function DefaultNavbarItemDesktop({
  className,
  isDropdownItem = false,
  ...props
}) {
  const element = (
    <NavbarNavLink
      className={clsx(
        isDropdownItem ? 'dropdown__link' : 'navbar__item navbar__link',
        className,
      )}
      isDropdownLink={isDropdownItem}
      {...props}
    />
  );
  if (isDropdownItem) {
    return <li>{element}</li>;
  }
  return element;
}
function DefaultNavbarItemMobile({className, isDropdownItem, ...props}) {
  return (
    <li className="menu__list-item">
      <NavbarNavLink className={clsx('menu__link', className)} {...props} />
    </li>
  );
}
export default function DefaultNavbarItem({
  mobile = false,
  position, // Need to destructure position from props so that it doesn't get passed on.
  analytics,
  ...props
}) {
  const Comp = mobile ? DefaultNavbarItemMobile : DefaultNavbarItemDesktop;
  // gtag addition
  const handleClick = () => {
    logEvent(analytics.event_name, {event_category: analytics.event_category, event_label: analytics.event_label});
  }
  return (
    <Comp
      {...props}
      onClick={analytics && handleClick}
      activeClassName={
        props.activeClassName ??
        (mobile ? 'menu__link--active' : 'navbar__link--active')
      }
    />
  );
}
