import PaymentResultPage from "@/components/store/PaymentResultPage";
import ClearBagOnSuccess from "@/components/store/ClearBagOnSuccess";

export default function PaymentSuccessPage() {
  return <><ClearBagOnSuccess /><PaymentResultPage tone="success" title="Payment submitted" message="Your order is confirmed after PCC receives the secure payment confirmation. We will contact you using the details supplied during checkout." /></>;
}
