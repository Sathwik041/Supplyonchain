"use client";

import type { NextPage } from "next";

const FAQs: NextPage = () => {
  const faqs = [
    {
      question: "How does the escrow work?",
      answer:
        "The buyer deposits the full amount into a smart contract. Funds are released in milestones: 30% for production start, 50% upon verified delivery, and 20% after final inspection.",
    },
    {
      question: "What is a Digital Machine Passport?",
      answer:
        "It's an NFT automatically minted by the protocol upon successful delivery. It contains the metadata (PO details, production logs) of the industrial asset, acting as a verifiable Certificate of Origin.",
    },
    {
      question: "What happens if there's a dispute?",
      answer:
        "A neutral third-party arbitrator (assigned at the start of the contract) reviews the evidence and can release funds either to the buyer or the seller based on the milestones achieved.",
    },
    {
      question: "Why use blockchain for supply chain?",
      answer:
        "Blockchain provides immutability, transparency, and automation. Payments are guaranteed by the contract logic, and tracking history is permanent and verifiable.",
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center grow bg-base-200 py-20 px-4">
      <div className="max-w-3xl w-full">
        <h1 className="text-4xl font-black mb-12 text-center">Frequently Asked Questions</h1>
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div key={index} className="collapse collapse-plus bg-base-100 shadow-md">
              <input type="radio" name="my-accordion-3" defaultChecked={index === 0} />
              <div className="collapse-title text-xl font-bold">{faq.question}</div>
              <div className="collapse-content">
                <p className="opacity-80">{faq.answer}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FAQs;
