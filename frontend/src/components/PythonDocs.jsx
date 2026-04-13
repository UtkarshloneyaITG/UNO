/**
 * PythonDocs — camouflage screen styled as Python 3 documentation.
 * Scroll to the bottom to reveal the hidden email input in the footer.
 * Entering "uno@zenova.com" unlocks the real application.
 */

import React, { useState, useEffect, useRef } from 'react'

const SECRET = 'uno@zenova.com'

export default function PythonDocs({ onUnlock }) {
  const [email, setEmail]           = useState('')
  const [footerVisible, setFooterVisible] = useState(false)
  const [shake, setShake]           = useState(false)
  const sentinelRef = useRef(null)
  const inputRef    = useRef(null)

  // Show footer once the sentinel div at the bottom enters the viewport
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setFooterVisible(true) },
      { threshold: 0.1 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // Focus input when footer appears
  useEffect(() => {
    if (footerVisible) setTimeout(() => inputRef.current?.focus(), 150)
  }, [footerVisible])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (email.trim().toLowerCase() === SECRET) {
      onUnlock()
    } else {
      setShake(true)
      setTimeout(() => setShake(false), 600)
      setEmail('')
    }
  }

  return (
    <div className="pydocs">
      {/* ── Top bar ── */}
      <div className="pydocs-topbar">
        <span className="pydocs-topbar-text">
          This is the documentation for Python 3.12.4.
        </span>
        <span className="pydocs-topbar-links">
          <a href="#">3.12.4</a> | <a href="#">3.11</a> | <a href="#">2.7</a>
        </span>
      </div>

      <div className="pydocs-layout">
        {/* ── Sidebar ── */}
        <aside className="pydocs-sidebar">
          <div className="pydocs-sidebar-logo">
            <span className="pydocs-logo-py">Py</span>
            <span className="pydocs-logo-thon">thon</span>
            <span className="pydocs-logo-version">3.12.4</span>
          </div>
          <div className="pydocs-sidebar-search">
            <input className="pydocs-search-input" placeholder="Quick search" />
            <button className="pydocs-search-btn">Go</button>
          </div>
          <nav className="pydocs-nav">
            <div className="pydocs-nav-section">Contents</div>
            <a className="pydocs-nav-link pydocs-nav-link--active" href="#">Built-in Functions</a>
            <a className="pydocs-nav-link" href="#">Built-in Constants</a>
            <a className="pydocs-nav-link" href="#">Built-in Types</a>
            <a className="pydocs-nav-link" href="#">Built-in Exceptions</a>
            <a className="pydocs-nav-link" href="#">Text Processing</a>
            <a className="pydocs-nav-link" href="#">Binary Data</a>
            <a className="pydocs-nav-link" href="#">Data Types</a>
            <a className="pydocs-nav-link" href="#">Numeric Modules</a>
            <a className="pydocs-nav-link" href="#">Functional Prog.</a>
            <a className="pydocs-nav-link" href="#">File and I/O</a>
            <a className="pydocs-nav-link" href="#">Cryptographic</a>
            <a className="pydocs-nav-link" href="#">OS Interfaces</a>
            <a className="pydocs-nav-link" href="#">Concurrency</a>
            <a className="pydocs-nav-link" href="#">Networking</a>
            <a className="pydocs-nav-link" href="#">Internet Protocols</a>
            <a className="pydocs-nav-link" href="#">Multimedia</a>
            <a className="pydocs-nav-link" href="#">Internationalisation</a>
            <a className="pydocs-nav-link" href="#">Development Tools</a>
            <a className="pydocs-nav-link" href="#">Debugging</a>
            <a className="pydocs-nav-link" href="#">Profiling</a>
          </nav>
        </aside>

        {/* ── Main content ── */}
        <main className="pydocs-main">
          <div className="pydocs-breadcrumb">
            <a href="#">index</a> &raquo; <a href="#">The Python Standard Library</a> &raquo; Built-in Functions
          </div>

          <h1 className="pydocs-h1">Built-in Functions</h1>

          <p className="pydocs-p">
            The Python interpreter has a number of functions and types built into it
            that are always available. They are listed here in alphabetical order.
          </p>

          <table className="pydocs-table">
            <tbody>
              {[
                ['abs()','aiter()','all()','anext()','any()','ascii()'],
                ['bin()','bool()','breakpoint()','bytearray()','bytes()','callable()'],
                ['chr()','classmethod()','compile()','complex()','delattr()','dict()'],
                ['dir()','divmod()','enumerate()','eval()','exec()','filter()'],
                ['float()','format()','frozenset()','getattr()','globals()','hasattr()'],
                ['hash()','help()','hex()','id()','input()','int()'],
                ['isinstance()','issubclass()','iter()','len()','list()','locals()'],
                ['map()','max()','memoryview()','min()','next()','object()'],
                ['oct()','open()','ord()','pow()','print()','property()'],
                ['range()','repr()','reversed()','round()','set()','setattr()'],
                ['slice()','sorted()','staticmethod()','str()','sum()','super()'],
                ['tuple()','type()','vars()','zip()','__import__()',''],
              ].map((row, i) => (
                <tr key={i}>
                  {row.map((fn, j) => (
                    <td key={j} className="pydocs-table-cell">
                      {fn && <a href="#" className="pydocs-fn-link">{fn}</a>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          {/* ── abs() ── */}
          <div className="pydocs-section">
            <div className="pydocs-funcdef" id="abs">
              <span className="pydocs-kw">abs</span>
              <span className="pydocs-paren">(</span>
              <span className="pydocs-param">x</span>
              <span className="pydocs-paren">)</span>
            </div>
            <p className="pydocs-p">
              Return the absolute value of a number. The argument may be an integer,
              a floating-point number, or an object implementing <code className="pydocs-code">__abs__()</code>.
              If the argument is a complex number, its magnitude is returned.
            </p>
          </div>

          {/* ── all() ── */}
          <div className="pydocs-section">
            <div className="pydocs-funcdef" id="all">
              <span className="pydocs-kw">all</span>
              <span className="pydocs-paren">(</span>
              <span className="pydocs-param">iterable</span>
              <span className="pydocs-paren">)</span>
            </div>
            <p className="pydocs-p">
              Return <code className="pydocs-code">True</code> if all elements of the <em>iterable</em> are
              true (or if the iterable is empty). Equivalent to:
            </p>
            <div className="pydocs-codeblock">
              <pre>{`def all(iterable):
    for element in iterable:
        if not element:
            return False
    return True`}</pre>
            </div>
          </div>

          {/* ── any() ── */}
          <div className="pydocs-section">
            <div className="pydocs-funcdef" id="any">
              <span className="pydocs-kw">any</span>
              <span className="pydocs-paren">(</span>
              <span className="pydocs-param">iterable</span>
              <span className="pydocs-paren">)</span>
            </div>
            <p className="pydocs-p">
              Return <code className="pydocs-code">True</code> if any element of the <em>iterable</em> is
              true. If the iterable is empty, return <code className="pydocs-code">False</code>. Equivalent to:
            </p>
            <div className="pydocs-codeblock">
              <pre>{`def any(iterable):
    for element in iterable:
        if element:
            return True
    return False`}</pre>
            </div>
          </div>

          {/* ── enumerate() ── */}
          <div className="pydocs-section">
            <div className="pydocs-funcdef" id="enumerate">
              <span className="pydocs-kw">enumerate</span>
              <span className="pydocs-paren">(</span>
              <span className="pydocs-param">iterable</span>
              <span className="pydocs-comma">, </span>
              <span className="pydocs-param">start</span>
              <span className="pydocs-default">=0</span>
              <span className="pydocs-paren">)</span>
            </div>
            <p className="pydocs-p">
              Return an enumerate object. <em>iterable</em> must be a sequence, an iterator,
              or some other object which supports iteration. The <code className="pydocs-code">__next__()</code> method
              of the iterator returned by <code className="pydocs-code">enumerate()</code> returns a tuple containing
              a count (from <em>start</em> which defaults to 0) and the values obtained from
              iterating over <em>iterable</em>.
            </p>
            <div className="pydocs-codeblock">
              <pre>{`>>> seasons = ['Spring', 'Summer', 'Fall', 'Winter']
>>> list(enumerate(seasons))
[(0, 'Spring'), (1, 'Summer'), (2, 'Fall'), (3, 'Winter')]
>>> list(enumerate(seasons, start=1))
[(1, 'Spring'), (2, 'Summer'), (3, 'Fall'), (4, 'Winter')]`}</pre>
            </div>
          </div>

          {/* ── filter() ── */}
          <div className="pydocs-section">
            <div className="pydocs-funcdef" id="filter">
              <span className="pydocs-kw">filter</span>
              <span className="pydocs-paren">(</span>
              <span className="pydocs-param">function</span>
              <span className="pydocs-comma">, </span>
              <span className="pydocs-param">iterable</span>
              <span className="pydocs-paren">)</span>
            </div>
            <p className="pydocs-p">
              Construct an iterator from those elements of <em>iterable</em> for which
              <em>function</em> is true. <em>iterable</em> may be either a sequence, a container
              which supports iteration, or an iterator. If <em>function</em> is
              <code className="pydocs-code">None</code>, the identity function is assumed, that is, all elements
              of <em>iterable</em> that are false are removed.
            </p>
          </div>

          {/* ── isinstance() ── */}
          <div className="pydocs-section">
            <div className="pydocs-funcdef" id="isinstance">
              <span className="pydocs-kw">isinstance</span>
              <span className="pydocs-paren">(</span>
              <span className="pydocs-param">object</span>
              <span className="pydocs-comma">, </span>
              <span className="pydocs-param">classinfo</span>
              <span className="pydocs-paren">)</span>
            </div>
            <p className="pydocs-p">
              Return <code className="pydocs-code">True</code> if the <em>object</em> argument is an instance
              of the <em>classinfo</em> argument, or of a (direct, indirect, or virtual)
              subclass thereof. If <em>object</em> is not an object of the given type, the
              function always returns <code className="pydocs-code">False</code>. If <em>classinfo</em> is a tuple
              of type objects (or recursively, other such tuples) or a <em>Union Type</em>
              of multiple types, return <code className="pydocs-code">True</code> if <em>object</em> is an
              instance of any of the types. If <em>classinfo</em> is not a type or tuple
              of types and such tuples, a <code className="pydocs-code">TypeError</code> exception is raised.
              <code className="pydocs-code">TypeError</code> may not be raised for an invalid type if an earlier
              check succeeds.
            </p>
          </div>

          {/* ── len() ── */}
          <div className="pydocs-section">
            <div className="pydocs-funcdef" id="len">
              <span className="pydocs-kw">len</span>
              <span className="pydocs-paren">(</span>
              <span className="pydocs-param">s</span>
              <span className="pydocs-paren">)</span>
            </div>
            <p className="pydocs-p">
              Return the length (the number of items) of an object. The argument may be
              a sequence (such as a string, bytes, tuple, list, or range) or a collection
              (such as a dictionary, set, or frozen set).
            </p>
            <p className="pydocs-p">
              Raises <code className="pydocs-code">TypeError</code> if the object does not provide
              <code className="pydocs-code">__len__()</code>. For example:
            </p>
            <div className="pydocs-codeblock">
              <pre>{`>>> len("hello")
5
>>> len([1, 2, 3])
3
>>> len({'a': 1, 'b': 2})
2`}</pre>
            </div>
          </div>

          {/* ── map() ── */}
          <div className="pydocs-section">
            <div className="pydocs-funcdef" id="map">
              <span className="pydocs-kw">map</span>
              <span className="pydocs-paren">(</span>
              <span className="pydocs-param">function</span>
              <span className="pydocs-comma">, </span>
              <span className="pydocs-param">iterable</span>
              <span className="pydocs-comma">, </span>
              <span className="pydocs-param">*iterables</span>
              <span className="pydocs-paren">)</span>
            </div>
            <p className="pydocs-p">
              Return an iterator that applies <em>function</em> to every item of
              <em>iterable</em>, yielding the results. If additional <em>iterables</em>
              arguments are passed, <em>function</em> must take that many arguments and is
              applied to the items from all iterables in parallel. With multiple iterables,
              the iterator stops when the shortest iterable is exhausted.
            </p>
          </div>

          {/* ── print() ── */}
          <div className="pydocs-section">
            <div className="pydocs-funcdef" id="print">
              <span className="pydocs-kw">print</span>
              <span className="pydocs-paren">(</span>
              <span className="pydocs-param">*objects</span>
              <span className="pydocs-comma">, </span>
              <span className="pydocs-param">sep</span>
              <span className="pydocs-default">=' '</span>
              <span className="pydocs-comma">, </span>
              <span className="pydocs-param">end</span>
              <span className="pydocs-default">='\n'</span>
              <span className="pydocs-comma">, </span>
              <span className="pydocs-param">file</span>
              <span className="pydocs-default">=None</span>
              <span className="pydocs-comma">, </span>
              <span className="pydocs-param">flush</span>
              <span className="pydocs-default">=False</span>
              <span className="pydocs-paren">)</span>
            </div>
            <p className="pydocs-p">
              Print <em>objects</em> to the text stream <em>file</em>, separated by
              <em>sep</em> and followed by <em>end</em>. <em>sep</em>, <em>end</em>,
              <em>file</em>, and <em>flush</em>, if present, must be given as keyword
              arguments.
            </p>
            <p className="pydocs-p">
              All non-keyword arguments are converted to strings like
              <code className="pydocs-code">str()</code> does and written to the stream, separated
              by <em>sep</em> and followed by <em>end</em>. Both <em>sep</em> and
              <em>end</em> must be strings; they can also be <code className="pydocs-code">None</code>,
              which means to use the default values. If no <em>objects</em> are given,
              <code className="pydocs-code">print()</code> will just write <em>end</em>.
            </p>
          </div>

          {/* ── range() ── */}
          <div className="pydocs-section">
            <div className="pydocs-funcdef" id="range">
              <span className="pydocs-kw">range</span>
              <span className="pydocs-paren">(</span>
              <span className="pydocs-param">stop</span>
              <span className="pydocs-paren">)</span>
            </div>
            <div className="pydocs-funcdef">
              <span className="pydocs-kw">range</span>
              <span className="pydocs-paren">(</span>
              <span className="pydocs-param">start</span>
              <span className="pydocs-comma">, </span>
              <span className="pydocs-param">stop</span>
              <span className="pydocs-comma">[, </span>
              <span className="pydocs-param">step</span>
              <span className="pydocs-comma">]</span>
              <span className="pydocs-paren">)</span>
            </div>
            <p className="pydocs-p">
              Rather than being a function, <code className="pydocs-code">range</code> is actually an
              immutable sequence type, as documented in <a href="#" className="pydocs-link">Ranges</a> and
              <a href="#" className="pydocs-link"> Sequence Types</a>.
            </p>
          </div>

          {/* ── sorted() ── */}
          <div className="pydocs-section">
            <div className="pydocs-funcdef" id="sorted">
              <span className="pydocs-kw">sorted</span>
              <span className="pydocs-paren">(</span>
              <span className="pydocs-param">iterable</span>
              <span className="pydocs-comma">, </span>
              <span className="pydocs-param">*</span>
              <span className="pydocs-comma">, </span>
              <span className="pydocs-param">key</span>
              <span className="pydocs-default">=None</span>
              <span className="pydocs-comma">, </span>
              <span className="pydocs-param">reverse</span>
              <span className="pydocs-default">=False</span>
              <span className="pydocs-paren">)</span>
            </div>
            <p className="pydocs-p">
              Return a new sorted list from the items in <em>iterable</em>.
            </p>
            <p className="pydocs-p">
              Has two optional arguments which must be specified as keyword arguments.
              <em>key</em> specifies a function of one argument that is used to extract a
              comparison key from each list element (for example,
              <code className="pydocs-code">key=str.lower</code>). The default value is
              <code className="pydocs-code">None</code> (compare the elements directly).
              <em>reverse</em> is a boolean value. If set to
              <code className="pydocs-code">True</code>, then the list elements are sorted as if each
              comparison were reversed.
            </p>
            <div className="pydocs-codeblock">
              <pre>{`>>> sorted([5, 2, 3, 1, 4])
[1, 2, 3, 4, 5]
>>> sorted("This is a test string".split(), key=str.casefold)
['a', 'is', 'string', 'test', 'This']`}</pre>
            </div>
          </div>

          {/* ── zip() ── */}
          <div className="pydocs-section">
            <div className="pydocs-funcdef" id="zip">
              <span className="pydocs-kw">zip</span>
              <span className="pydocs-paren">(</span>
              <span className="pydocs-param">*iterables</span>
              <span className="pydocs-comma">, </span>
              <span className="pydocs-param">strict</span>
              <span className="pydocs-default">=False</span>
              <span className="pydocs-paren">)</span>
            </div>
            <p className="pydocs-p">
              Iterate over several iterables in parallel, producing tuples with an item
              from each one.
            </p>
            <div className="pydocs-codeblock">
              <pre>{`>>> for item in zip([1, 2, 3], ['sugar', 'spice', 'everything nice']):
...     print(item)
...
(1, 'sugar')
(2, 'spice')
(3, 'everything nice')`}</pre>
            </div>
            <p className="pydocs-p">
              More formally: <code className="pydocs-code">zip()</code> returns an iterator of tuples,
              where the <em>i</em>-th tuple contains the <em>i</em>-th element from each
              of the argument iterables.
            </p>
            <p className="pydocs-p">
              Another way to think of <code className="pydocs-code">zip()</code> is that it turns rows
              into columns, and columns into rows. This is similar to transposing a matrix.
            </p>
          </div>

          {/* ── type() ── */}
          <div className="pydocs-section">
            <div className="pydocs-funcdef" id="type">
              <span className="pydocs-kw">type</span>
              <span className="pydocs-paren">(</span>
              <span className="pydocs-param">object</span>
              <span className="pydocs-paren">)</span>
            </div>
            <div className="pydocs-funcdef">
              <span className="pydocs-kw">type</span>
              <span className="pydocs-paren">(</span>
              <span className="pydocs-param">name</span>
              <span className="pydocs-comma">, </span>
              <span className="pydocs-param">bases</span>
              <span className="pydocs-comma">, </span>
              <span className="pydocs-param">dict</span>
              <span className="pydocs-comma">, </span>
              <span className="pydocs-param">**kwds</span>
              <span className="pydocs-paren">)</span>
            </div>
            <p className="pydocs-p">
              With one argument, return the type of an <em>object</em>. The return value
              is a type object and generally the same object as returned by
              <code className="pydocs-code">object.__class__</code>.
            </p>
            <p className="pydocs-p">
              The <code className="pydocs-code">isinstance()</code> built-in function is recommended for
              testing the type of an object, because it takes subclasses into account.
            </p>
            <div className="pydocs-codeblock">
              <pre>{`>>> type(1)
<class 'int'>
>>> type('hello')
<class 'str'>
>>> type([])
<class 'list'>`}</pre>
            </div>
          </div>

          {/* ── vars() ── */}
          <div className="pydocs-section">
            <div className="pydocs-funcdef" id="vars">
              <span className="pydocs-kw">vars</span>
              <span className="pydocs-paren">(</span>
              <span className="pydocs-paren">)</span>
            </div>
            <div className="pydocs-funcdef">
              <span className="pydocs-kw">vars</span>
              <span className="pydocs-paren">(</span>
              <span className="pydocs-param">object</span>
              <span className="pydocs-paren">)</span>
            </div>
            <p className="pydocs-p">
              Return the <code className="pydocs-code">__dict__</code> attribute for a module, class,
              instance, or any other object with a <code className="pydocs-code">__dict__</code> attribute.
              Objects such as modules and instances have an updateable
              <code className="pydocs-code">__dict__</code> attribute; however, other objects may have write
              restrictions on their <code className="pydocs-code">__dict__</code> attributes (for example,
              classes use a <code className="pydocs-code">types.MappingProxyType</code> to prevent direct
              dictionary updates).
            </p>
          </div>

          {/* sentinel for IntersectionObserver */}
          <div ref={sentinelRef} style={{ height: 1 }} />

          {/* ── prev / next navigation ── */}
          <div className="pydocs-nav-bottom">
            <a href="#" className="pydocs-nav-prev">« The Python Standard Library</a>
            <a href="#" className="pydocs-nav-next">Built-in Constants »</a>
          </div>
        </main>
      </div>

      {/* ── Hidden footer — appears after scrolling to bottom ── */}
      <footer className={`pydocs-footer ${footerVisible ? 'pydocs-footer--visible' : ''}`}>
        <div className="pydocs-footer-inner">
          <span className="pydocs-footer-label">
            © 2001–2024 Python Software Foundation |
            <a href="#" className="pydocs-footer-link"> Docs</a> |
            <a href="#" className="pydocs-footer-link"> Bugs</a> |
            <a href="#" className="pydocs-footer-link"> Privacy Policy</a>
          </span>
          <form className={`pydocs-secret-form ${shake ? 'pydocs-secret-form--shake' : ''}`} onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              className="pydocs-secret-input"
              type="email"
              placeholder="Newsletter email…"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="off"
            />
            <button className="pydocs-secret-btn" type="submit">Subscribe</button>
          </form>
        </div>
      </footer>
    </div>
  )
}
