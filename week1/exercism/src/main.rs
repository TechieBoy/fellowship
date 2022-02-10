use rand::{thread_rng, Rng};
// fibonacci
fn create_buffer(count: usize) -> Vec<usize> {
    vec![0; count]
}

fn fibonacci() -> Vec<usize> {
    let mut v = create_buffer(5);
    for i in 0..5 {
        if i < 2 {
            v[i] = 1;
        } else {
            v[i] = v[i - 1] + v[i - 2]
        }
    }
    v
}

// Macro
macro_rules! hashmap {
    () => {
        std::collections::HashMap::new();
    };
    ($($fe:expr => $e:expr),+) => {{
        let mut hm = std::collections::HashMap::new();
        $( hm.insert($fe, $e);)+
        hm

    }};
}

// Cipher

fn shift_cipher_encode(t: &str) -> String {
    let mut s = String::new();
    for i in t.chars() {
        s.push(((i as u8 + 3) % 128) as char);
    }
    s
}

fn shift_cipher_decode(t: &str) -> String {
    let mut s = String::new();
    for i in t.chars() {
        s.push(((i as u8 - 3) % 128) as char);
    }
    s
}

pub fn ceaser_encode(s: &str, key: Option<&str>) -> String {
    let v: String;
    if key.is_none() {
        v = (0..100)
            .map(|_| (thread_rng().gen_range(b'a'..(b'z' + 1))) as char)
            .collect::<String>();
        println!("Using random key: {:?}", v);
    } else {
        v = key.unwrap().to_string();
    }
    s.chars()
        .zip(v.chars().cycle())
        .map(|(c, k)| shift(c, k, true))
        .collect()
}
pub fn ceaser_decode(s: &str, key: &str) -> String {
    s.chars()
        .zip(key.chars().cycle())
        .map(|(c, k)| shift(c, k, false))
        .collect()
}

fn shift(c: char, k: char, add: bool) -> char {
    const START: i32 = 'a' as i32;
    let d1 = c as i32 - START;
    let d2 = k as i32 - START;
    let r = if add { d1 + d2 } else { d1 - d2 };
    (r.rem_euclid(26) + START) as u8 as char
}

// Simple assert tests for functions above
fn main() {
    let my_buffer = create_buffer(5);
    assert_eq!(my_buffer, vec![0, 0, 0, 0, 0]);

    let fib = fibonacci();
    assert_eq!(fib, vec![1, 1, 2, 3, 5]);

    let b = hashmap!('a' => 3, 'b' => 11, 'z'=>2);
    println!("{:?}", b);

    let s = shift_cipher_encode("iamapandabear");
    assert_eq!(s, "ldpdsdqgdehdu");

    let s = shift_cipher_decode("ldpdsdqgdehdu");
    assert_eq!(s, "iamapandabear");

    let k = ceaser_encode("iamapandabear", Some("ddd"));
    assert_eq!(k, "ldpdsdqgdehdu");

    let k2 = ceaser_encode("iamapandabear", None);
    println!("{:?}", k2);
}
