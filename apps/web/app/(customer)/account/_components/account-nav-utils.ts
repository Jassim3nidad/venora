export function isAccountNavItemActive(pathname: string, href: string) {
  if (href === "/account") {
    return (
      pathname === "/account" ||
      pathname.startsWith("/account/personal-details") ||
      pathname.startsWith("/account/change-password")
    );
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
