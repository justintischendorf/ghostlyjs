"use client";

import MemberCard from "@/components/member";
import { Ghost } from "ghostlyjs";
import { CircleCheck, LoaderCircle } from "lucide-react";
import React from "react";

export default function Home() {
  const [isLoading, setIsLoading] = React.useState(true);

  return (
    <main className="flex flex-col sm:p-22 p-14 sm:gap-20 gap-8 relative">
      <div className="w-full flex flex-col gap-2">
        <div className="flex justify-between sm:items-baseline items-center">
          <h1 className="sm:text-4xl text-2xl font-bold">
            Playground for Ghostly
          </h1>
          <Ghost name="avatar" isLoading={isLoading}>
            <div className="h-20 w-20 sm:w-30 sm:h-30 rounded-full bg-accent shrink-0"></div>
          </Ghost>
        </div>
        <div className="w-full h-0.5 bg-accent rounded-full"></div>
      </div>
      <div className="flex sm:flex-row flex-col sm:flex-1 gap-6">
        <Ghost name="heading" isLoading={isLoading}>
          <div className="flex flex-col gap-5 border border-accent/50 sm:p-10 p-5 rounded-3xl sm:flex-1">
            <h1 className="sm:text-2xl text-xl font-bold">Heading</h1>
            <p className="sm:text-lg text-base">
              lorem ipsum dolor sit amet lorem ipsum dolor sit amet lorem ipsum
              dolor sit amet lorem ipsum dolor sit amet lorem ipsum dolor sit
              amet lorem ipsum dolor sit amet lorem ipsum dolor sit amet lorem
              ipsum dolor sit amet lorem ipsum dolor sit amet lorem ipsum dolor
              sit amet lorem ipsum dolor sit amet lorem ipsum dolor sit amet
              lorem ipsum dolor sit amet lorem ipsum dolor sit amet lorem ipsum
              dolor sit amet lorem ipsum dolor sit amet lorem ipsum dolor sit
              amet lorem ipsum dolor sit amet lorem ipsum dolor sit amet lorem
              ipsum dolor sit amet lorem ipsum dolor sit amet lorem ipsum dolor
              sit amet lorem ipsum dolor sit amet lorem ipsum dolor sit amet
              lorem ipsum dolor sit amet lorem ipsum dolor sit amet lorem ipsum
              dolor sit amet lorem ipsum dolor sit amet lorem ipsum dolor sit
              amet lorem ipsum dolor sit amet
            </p>
          </div>
        </Ghost>
        <div className="sm:flex-1 grid sm:grid-cols-2 grid-cols-1 sm:gap-5 gap-2 content-start">
          {Array.from({ length: 9 }, (_, index) => (
            <Ghost
              key={index}
              name={`member-card-${index}`}
              isLoading={isLoading}
            >
              <MemberCard />
            </Ghost>
          ))}
        </div>
      </div>
      <Ghost name="footer" isLoading={isLoading}>
        <div className="w-full border border-accent/50 rounded-2xl border-dashed h-40"></div>
      </Ghost>
      <button
        type="button"
        className="absolute sm:top-10 sm:left-10 left-4 top-4 border border-accent/50 rounded-xl sm:p-3 p-1 hover:border-blue-400"
        onClick={() => setIsLoading(!isLoading)}
        aria-label={isLoading ? "Show content" : "Show skeletons"}
        title={isLoading ? "Show content" : "Show skeletons"}
      >
        {isLoading ? (
          <LoaderCircle className="animate-spin" />
        ) : (
          <CircleCheck />
        )}
      </button>
    </main>
  );
}
