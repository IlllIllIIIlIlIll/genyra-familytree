export default function PendingApprovalPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-brand-50">
      <div className="w-full max-w-sm text-center">
        <div className="bg-white rounded-2xl shadow-sm border border-brand-100 p-8">
          <div className="text-4xl mb-4">⏳</div>
          <h1 className="text-xl font-semibold text-slate-800 mb-2">
            Awaiting Approval
          </h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            Your registration has been submitted. The Family Head will review
            and approve your request shortly.
          </p>
          <p className="text-xs text-slate-400 mt-4">
            You will be able to sign in once approved.
          </p>
        </div>
      </div>
    </main>
  )
}
