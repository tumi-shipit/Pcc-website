import PaymentResultPage from "@/components/store/PaymentResultPage";
import ClearBagOnSuccess from "@/components/store/ClearBagOnSuccess";

export default function PaymentSuccessPage() {
  return <><ClearBagOnSuccess /><PaymentResultPage tone="success" title="Payment submitted" message="Yoco has returned you to PCC. Your order is confirmed only after PCC receives Yoco’s signed payment notification. We will contact you using the details supplied during checkout." /></>;
}
