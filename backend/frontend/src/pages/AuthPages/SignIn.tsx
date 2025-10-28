import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignInForm from "../../components/auth/SignInForm";

export default function SignIn() {
  return (
    <>
      <PageMeta
        title="login"
        description="This is React.js SignIn"
      />
      <AuthLayout>
        <SignInForm />
      </AuthLayout>
    </>
  );
}
