import React, { useMemo } from 'react';
import { db, collection, query, where, useCollectionData, doc, updateDoc, increment } from '../lib/firebase';
import { UserProfile } from '../types';
import { Check, X, Brain } from 'lucide-react';

export function TeacherEvaluationsView({ profile }: { profile: UserProfile }) {
  const qSubs = useMemo(() => {
    console.log('Querying submissions with:', { subject: profile.teacherSubject, schoolCode: profile.schoolCode });
    return query(
      collection(db, 'submissions'),
      where('subject', '==', profile.teacherSubject || ''),
      where('schoolCode', '==', profile.schoolCode),
      where('status', '==', 'pending')
    );
  }, [profile.teacherSubject, profile.schoolCode]);

  const [submissions, loading] = useCollectionData(qSubs, { idField: 'id' } as any);
  
  React.useEffect(() => {
    if (!loading) {
      console.log('Submissions loaded:', submissions);
    }
  }, [submissions, loading]);

  const gradeSubmission = async (sub: any, points: number) => {
    console.log('Grading submission:', sub.id, points);
    await updateDoc(doc(db, 'submissions', sub.id), {
      pointsAwarded: points,
      status: 'graded'
    });
    // Add points to student
    if (sub.studentId) {
      await updateDoc(doc(db, 'users', sub.studentId), {
         points: increment(points)
      });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <h2 className="serif text-5xl italic text-white leading-none tracking-tighter">Evaluări (Toate)</h2>
      {loading ? (
        <div className="text-brand-accent animate-pulse">Se încarcă temele...</div>
      ) : (
        <div className="grid gap-6">
          {submissions?.map((sub: any) => (
            <div key={sub.id} className="bg-card-bg border border-white/5 p-6 rounded-[2rem] gap-6 flex flex-col">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-white text-lg font-bold">{sub.title} ({sub.status || 'fară status'})</h4>
                  <p className="text-white/40 text-sm">Student: {sub.studentName}</p>
                </div>
                <div className="flex items-center gap-2">
                  <input type="number" id={`points-${sub.id}`} placeholder="Puncte" className="bg-black/20 text-white p-2 rounded w-20" />
                  <button 
                    onClick={() => {
                      const pts = parseInt((document.getElementById(`points-${sub.id}`) as HTMLInputElement).value || '0');
                      gradeSubmission(sub, pts);
                    }}
                    className="bg-brand-accent text-white p-2 rounded-full"
                  >
                    <Check size={20} />
                  </button>
                </div>
              </div>
              
              {sub.requirement && (
                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                  <p className="text-white/60 text-xs uppercase tracking-widest mb-1 italic">Cerință</p>
                  <p className="text-white">{sub.requirement}</p>
                </div>
              )}
              
              {/* Display content or imageUrl if available */}
              {(sub.content || sub.imageUrl) && (
                <div className="bg-black/20 p-4 rounded-xl border border-white/10">
                  <p className="text-white/60 text-xs uppercase tracking-widest mb-1 italic">Răspuns student</p>
                  {sub.imageUrl ? (
                    <img src={sub.imageUrl} alt="Tema studentului" className="max-w-full h-auto rounded-lg border border-white/10" />
                  ) : (
                    <p className="text-white whitespace-pre-wrap">{sub.content}</p>
                  )}
                </div>
              )}
            </div>
          ))}
          {submissions?.length === 0 && <p className="text-white/40 italic">Nu există teme încărcate.</p>}
        </div>
      )}
    </div>
  );
}
