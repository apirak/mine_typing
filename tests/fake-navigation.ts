// Test double for next/navigation: renderToStaticMarkup has no app
// router, so the screen tests alias next/navigation here and record the
// navigations instead of performing them.

export const navigations: string[] = [];

export function useRouter() {
  return {
    push: (href: string) => {
      navigations.push(href);
    },
  };
}
