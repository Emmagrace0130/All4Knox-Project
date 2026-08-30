import { LinkButton } from '../components/common/Button';
import { PageContainer } from '../components/layout/PageContainer';

export function NotFound() {
  return (
    <PageContainer
      title="Page not found"
      lede="That tool does not exist yet, or the address is wrong."
      width="reading"
    >
      <LinkButton to="/">Back to the toolkit</LinkButton>
    </PageContainer>
  );
}
